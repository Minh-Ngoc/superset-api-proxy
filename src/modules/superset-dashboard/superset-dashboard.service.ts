import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupersetApplicationService } from '../superset-application/superset-application.service';
import { RlsTemplate } from '../superset-rls-template/schemas/rls-template.schema';
import { SupersetRlsTemplateService } from '../superset-rls-template/superset-rls-template.service';
import { CreateSupersetDashboardDto } from './dto/create-dashboard.dto';
import { UpdateSupersetDashboardDto } from './dto/update-dashboard.dto';
import {
  SupersetDashboard,
  SupersetDashboardDocument,
} from './schemas/superset-dashboard.schema';

@Injectable()
export class SupersetDashboardService {
  private readonly logger = new Logger(SupersetDashboardService.name);

  constructor(
    @InjectModel(SupersetDashboard.name)
    private readonly dashboardModel: Model<SupersetDashboardDocument>,
    private readonly applicationService: SupersetApplicationService,
    private readonly rlsTemplateService: SupersetRlsTemplateService,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`ObjectId không hợp lệ: ${id}`);
    }

    return new Types.ObjectId(id);
  }

  private omitUndefined<T extends Record<string, unknown>>(
    value: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<T>;
  }

  private async assertDashboardUnique(
    dto: Pick<
      CreateSupersetDashboardDto,
      'embeddedId' | 'route' | 'applicationId'
    >,
    excludeId?: string,
  ) {
    const idFilter = excludeId
      ? { _id: { $ne: this.toObjectId(excludeId) } }
      : {};

    const embeddedConflict = await this.dashboardModel.findOne({
      embeddedId: dto.embeddedId,
      applicationId: dto?.applicationId,
      ...idFilter,
    });

    if (embeddedConflict) {
      throw new ConflictException(
        `Dashboard embeddedId="${dto.embeddedId}" đã tồn tại`,
      );
    }

    const routeConflict = await this.dashboardModel.findOne({
      applicationId: this.toObjectId(dto.applicationId),
      route: dto.route,
      ...idFilter,
    });

    if (routeConflict) {
      throw new ConflictException(
        `Dashboard route="${dto.route}" đã tồn tại trong application này`,
      );
    }
  }

  async create(dto: CreateSupersetDashboardDto): Promise<SupersetDashboard> {
    await this.applicationService.assertActive(dto.applicationId);
    await this.assertDashboardUnique(dto);
    await this.rlsTemplateService.assertBelongToApplication(
      dto.rlsTemplateIds,
      dto.applicationId,
    );

    const created = await this.dashboardModel.create({
      ...dto,
      applicationId: this.toObjectId(dto.applicationId),
      rlsTemplateIds: this.rlsTemplateService
        .normalizeIds(dto.rlsTemplateIds)
        .map((id) => this.toObjectId(id)),
    });

    this.logger.log(`Created dashboard: ${dto.embeddedId}`);
    return created.toObject();
  }

  async findAll(applicationId?: string): Promise<SupersetDashboard[]> {
    const filter = applicationId
      ? { applicationId: this.toObjectId(applicationId) }
      : {};

    return this.dashboardModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string): Promise<SupersetDashboard> {
    const dashboard = await this.dashboardModel.findById(id).lean();

    if (!dashboard) {
      throw new NotFoundException(`Dashboard id=${id} không tồn tại`);
    }

    return dashboard;
  }

  async getEmbeddedIdByRoute(
    route: string,
    applicationId?: string,
  ): Promise<{ embeddedId: string }> {
    const dashboard = await this.findByRoute(route, applicationId);
    return { embeddedId: dashboard.embeddedId };
  }

  async getEmbeddedIdByPath(path: string): Promise<{ embeddedId: string }> {
    return this.getEmbeddedIdByRoute(path);
  }

  async findByRoute(
    route: string,
    applicationId?: string,
  ): Promise<SupersetDashboard> {
    const filter = {
      route,
      isActive: true,
      ...(applicationId
        ? { applicationId: this.toObjectId(applicationId) }
        : {}),
    };

    const dashboard = await this.dashboardModel.findOne(filter).lean();

    if (!dashboard) {
      throw new NotFoundException(
        `Dashboard route="${route}" không tồn tại hoặc inactive`,
      );
    }

    return dashboard;
  }

  async findByPath(path: string): Promise<SupersetDashboard> {
    return this.findByRoute(path);
  }

  async findByEmbeddedId(embeddedId: string): Promise<SupersetDashboard> {
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
    const current = await this.dashboardModel.findById(id).lean();
    if (!current) {
      throw new NotFoundException(`Dashboard id=${id} không tồn tại`);
    }

    const applicationId = dto.applicationId ?? current.applicationId.toString();

    if (dto.applicationId) {
      await this.applicationService.assertActive(dto.applicationId);
    }

    await this.assertDashboardUnique(
      {
        embeddedId: dto.embeddedId ?? current.embeddedId,
        route: dto.route ?? current.route,
        applicationId,
      },
      id,
    );

    if (dto.rlsTemplateIds) {
      await this.rlsTemplateService.assertBelongToApplication(
        dto.rlsTemplateIds,
        applicationId,
      );
    }

    const update = this.omitUndefined({
      ...dto,
      applicationId: this.toObjectId(applicationId),
      rlsTemplateIds: dto.rlsTemplateIds
        ? this.rlsTemplateService
            .normalizeIds(dto.rlsTemplateIds)
            .map((templateId) => this.toObjectId(templateId))
        : undefined,
    });

    const updated = await this.dashboardModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
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

    this.logger.log(`Dashboard id=${id} isActive=${dashboard.isActive}`);

    return dashboard.toObject();
  }

  async getDashboardRlsTemplates(
    dashboard: SupersetDashboard,
  ): Promise<RlsTemplate[]> {
    return this.rlsTemplateService.findByIdsForApplication(
      dashboard.rlsTemplateIds ?? [],
      dashboard.applicationId,
    );
  }

  injectRls(
    templates: RlsTemplate[],
    context: Record<string, string>,
  ): { dataset: number; clause: string }[] {
    return this.rlsTemplateService.injectRls(templates, context);
  }
}
