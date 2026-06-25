import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    SupersetDashboard,
    SupersetDashboardDocument,
    RlsRule,
} from './schemas/superset-dashboard.schema';
import { Model } from 'mongoose';
import { CreateSupersetDashboardDto } from './dto/create-dashboard.dto';
import { UpdateSupersetDashboardDto } from './dto/update-dashboard.dto';

@Injectable()
export class SupersetDashboardService {
    private readonly logger = new Logger(SupersetDashboardService.name);

    constructor(
        @InjectModel(SupersetDashboard.name)
        private readonly dashboardModel: Model<SupersetDashboardDocument>,
    ) { }

    // ─────────────────────────────────────────────────────────────
    // VALIDATION HELPERS
    // ─────────────────────────────────────────────────────────────

    private validateClause(clause: string, variables: string[]) {
        const matches = clause.match(/\{\{(\w+)\}\}/g) || [];
        const usedVars = matches.map((v) => v.replace(/[{}]/g, ''));

        for (const v of usedVars) {
            if (!variables.includes(v)) {
                throw new BadRequestException(
                    `Variable "${v}" chưa được khai báo trong variables[]`,
                );
            }
        }

        // basic SQL injection guard
        const forbidden = /(drop|delete|insert|update|;)/i;
        if (forbidden.test(clause)) {
            throw new BadRequestException(`RLS clause không hợp lệ`);
        }
    }

    private validateRls(rules: RlsRule[]) {
        const datasetSet = new Set<number>();

        for (const rule of rules) {
            if (datasetSet.has(rule.dataset)) {
                throw new BadRequestException(
                    `Dataset ${rule.dataset} bị duplicate trong RLS`,
                );
            }
            datasetSet.add(rule.dataset);

            this.validateClause(rule.clause, rule.variables || []);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────

    async create(dto: CreateSupersetDashboardDto): Promise<SupersetDashboard> {
        const existing = await this.dashboardModel.findOne({
            embeddedId: dto.embeddedId,
        });

        if (existing) {
            throw new ConflictException(
                `Dashboard embeddedId="${dto.embeddedId}" đã tồn tại`,
            );
        }

        this.validateRls(dto.rls);

        const created = await this.dashboardModel.create({
            ...dto,
            rls: dto.rls.map((r) => ({
                ...r,
                clause: this.normalizeClause(r.clause),
            })),
        });

        this.logger.log(`Created dashboard: ${dto.embeddedId}`);
        return created;
    }

    async findAll(): Promise<SupersetDashboard[]> {
        return this.dashboardModel
            .find()
            .sort({ createdAt: -1 })
            .lean();
    }

    async findOne(id: string): Promise<SupersetDashboard> {
        const dashboard = await this.dashboardModel.findById(id).lean();

        if (!dashboard) {
            throw new NotFoundException(`Dashboard id=${id} không tồn tại`);
        }

        return dashboard;
    }

    async getEmbeddedIdByPath(
        path: string,
    ): Promise<{ embeddedId: string }> {
        const dashboard = await this.findByPath(path);

        return { embeddedId: dashboard?.embeddedId }
    }

    async findByPath(
        path: string,
    ): Promise<SupersetDashboard> {
        const dashboard = await this.dashboardModel
            .findOne({ path, isActive: true })
            .lean();

        if (!dashboard) {
            throw new NotFoundException(
                `Dashboard path="${path}" không tồn tại hoặc inactive`,
            );
        }

        return dashboard;
    }

    async findByEmbeddedId(
        embeddedId: string,
    ): Promise<SupersetDashboard> {
        const dashboard = await this.dashboardModel
            .findOne({ embeddedId, isActive: true })
            .lean();

        if (!dashboard) {
            throw new NotFoundException(
                `Dashboard embeddedId="${embeddedId}" không tồn tại hoặc inactive`,
            );
        }

        return dashboard;
    }

    async update(
        id: string,
        dto: UpdateSupersetDashboardDto,
    ): Promise<SupersetDashboard> {
        if (dto.embeddedId) {
            const conflict = await this.dashboardModel.findOne({
                embeddedId: dto.embeddedId,
                _id: { $ne: id },
            });

            if (conflict) {
                throw new ConflictException(
                    `embeddedId="${dto.embeddedId}" đã được dùng`,
                );
            }
        }

        if (dto.rls) {
            this.validateRls(dto.rls);
            dto.rls = dto.rls.map((r) => ({
                ...r,
                clause: this.normalizeClause(r.clause),
            }));
        }

        const updated = await this.dashboardModel
            .findByIdAndUpdate(id, { $set: dto }, { new: true })
            .lean();

        if (!updated) {
            throw new NotFoundException(`Dashboard id=${id} không tồn tại`);
        }

        this.logger.log(`Updated dashboard: ${id}`);
        return updated;
    }

    async remove(id: string): Promise<void> {
        const result = await this.dashboardModel.findByIdAndDelete(id);

        if (!result) {
            throw new NotFoundException(`Dashboard id=${id} không tồn tại`);
        }

        this.logger.log(`Deleted dashboard: ${id}`);
    }

    async toggleActive(id: string): Promise<SupersetDashboard> {
        const dashboard = await this.dashboardModel.findById(id);

        if (!dashboard) {
            throw new NotFoundException(`Dashboard id=${id} không tồn tại`);
        }

        dashboard.isActive = !dashboard.isActive;
        await dashboard.save();

        this.logger.log(
            `Dashboard id=${id} isActive=${dashboard.isActive}`,
        );

        return dashboard.toObject();
    }

    // ─────────────────────────────────────────────────────────────
    // RUNTIME RLS INJECTION
    // ─────────────────────────────────────────────────────────────

    injectRls(
        rules: RlsRule[],
        context: Record<string, string>,
    ): { dataset: number; clause: string }[] {
        return rules?.map((rule) => {
            const formatData = {
                dataset: rule?.dataset,
                clause: rule?.clause?.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                    if (!rule?.variables.includes(key)) {
                        throw new BadRequestException(
                            `Variable ${key} không được phép`,
                        );
                    }

                    const value = context?.[key] ?? "";

                    if (!value) {
                        throw new BadRequestException(
                            `Thiếu giá trị cho variable ${key}`,
                        );
                    }

                    return `'${value?.replace(/'/g, "''")}'`;
                }),
            }

            return formatData;
        });
    }

    // ─────────────────────────────────────────────────────────────
    // UTILS
    // ─────────────────────────────────────────────────────────────

    private normalizeClause(clause: string): string {
        return clause.trim().replace(/\s+/g, ' ');
    }
}
