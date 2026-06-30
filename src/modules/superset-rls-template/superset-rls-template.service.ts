import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupersetApplicationService } from '../superset-application/superset-application.service';
import { CreateRlsTemplateDto } from './dto/create-rls-template.dto';
import { UpdateRlsTemplateDto } from './dto/update-rls-template.dto';
import {
  RlsTemplate,
  RlsTemplateDocument,
} from './schemas/rls-template.schema';

@Injectable()
export class SupersetRlsTemplateService {
  private readonly logger = new Logger(SupersetRlsTemplateService.name);

  constructor(
    @InjectModel(RlsTemplate.name)
    private readonly rlsTemplateModel: Model<RlsTemplateDocument>,
    private readonly applicationService: SupersetApplicationService,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`ObjectId không hợp lệ: ${id}`);
    }

    return new Types.ObjectId(id);
  }

  private normalizeClause(clause: string): string {
    return clause.trim().replace(/\s+/g, ' ');
  }

  normalizeIds(ids: string[] = []): string[] {
    return [...new Set(ids)];
  }

  validateClause(clause: string, variables: string[] = []) {
    const matches = clause.match(/\{\{(\w+)\}\}/g) || [];
    const usedVars = matches.map((v) => v.replace(/[{}]/g, ''));

    for (const variable of usedVars) {
      if (!variables.includes(variable)) {
        throw new BadRequestException(
          `Variable "${variable}" chưa được khai báo trong variables[]`,
        );
      }
    }

    const forbidden = /(drop|delete|insert|update|;)/i;
    if (forbidden.test(clause)) {
      throw new BadRequestException('RLS clause không hợp lệ');
    }
  }

  async assertBelongToApplication(
    rlsTemplateIds: string[] = [],
    applicationId: string,
  ): Promise<void> {
    const uniqueIds = this.normalizeIds(rlsTemplateIds);
    if (!uniqueIds.length) return;

    const count = await this.rlsTemplateModel.countDocuments({
      _id: { $in: uniqueIds.map((id) => this.toObjectId(id)) },
      applicationId: this.toObjectId(applicationId),
    });

    if (count !== uniqueIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều RLS template không thuộc application của dashboard',
      );
    }
  }

  async create(dto: CreateRlsTemplateDto): Promise<RlsTemplate> {
    await this.applicationService.assertActive(dto.applicationId);
    this.validateClause(dto.clause, dto.variables);

    const created = await this.rlsTemplateModel.create({
      ...dto,
      applicationId: this.toObjectId(dto.applicationId),
      clause: this.normalizeClause(dto.clause),
    });

    this.logger.log(
      `Created RLS template: application=${dto.applicationId}, dataset=${dto.dataset}`,
    );

    return created.toObject();
  }

  async findAll(applicationId?: string): Promise<RlsTemplate[]> {
    const filter = applicationId
      ? { applicationId: this.toObjectId(applicationId) }
      : {};

    return this.rlsTemplateModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async update(id: string, dto: UpdateRlsTemplateDto): Promise<RlsTemplate> {
    const current = await this.rlsTemplateModel.findById(id).lean();
    if (!current) {
      throw new NotFoundException(`RLS template id=${id} không tồn tại`);
    }

    const applicationId = dto.applicationId ?? current.applicationId.toString();

    if (dto.applicationId) {
      await this.applicationService.assertActive(dto.applicationId);
    }

    if (dto.clause || dto.variables) {
      this.validateClause(
        dto.clause ?? current.clause,
        dto.variables ?? current.variables,
      );
    }

    const update = this.omitUndefined({
      ...dto,
      applicationId: this.toObjectId(applicationId),
      clause: dto.clause ? this.normalizeClause(dto.clause) : undefined,
    });

    const updated = await this.rlsTemplateModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();

    if (!updated) {
      throw new NotFoundException(`RLS template id=${id} không tồn tại`);
    }

    return updated;
  }

  async findByIdsForApplication(
    ids: Types.ObjectId[],
    applicationId: Types.ObjectId,
  ): Promise<RlsTemplate[]> {
    if (!ids.length) return [];

    return this.rlsTemplateModel
      .find({
        _id: { $in: ids },
        applicationId,
      })
      .lean();
  }

  injectRls(
    templates: RlsTemplate[],
    context: Record<string, string>,
  ): { dataset: number; clause: string }[] {
    return templates.map((template) => ({
      dataset: template.dataset,
      clause: template.clause.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (!template.variables.includes(key)) {
          throw new BadRequestException(`Variable ${key} không được phép`);
        }

        const value = context?.[key] ?? '';

        if (!value) {
          throw new BadRequestException(`Thiếu giá trị cho variable ${key}`);
        }

        return `'${value.replace(/'/g, "''")}'`;
      }),
    }));
  }

  private omitUndefined<T extends Record<string, unknown>>(
    value: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<T>;
  }
}
