import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSupersetApplicationDto } from './dto/create-application.dto';
import { UpdateSupersetApplicationDto } from './dto/update-application.dto';
import {
  SupersetApplication,
  SupersetApplicationDocument,
} from './schemas/superset-application.schema';

@Injectable()
export class SupersetApplicationService {
  private readonly logger = new Logger(SupersetApplicationService.name);

  constructor(
    @InjectModel(SupersetApplication.name)
    private readonly applicationModel: Model<SupersetApplicationDocument>,
  ) {}

  toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`ObjectId không hợp lệ: ${id}`);
    }

    return new Types.ObjectId(id);
  }

  async assertActive(applicationId: string): Promise<void> {
    const application = await this.applicationModel.exists({
      _id: this.toObjectId(applicationId),
      isActive: true,
    });

    if (!application) {
      throw new NotFoundException(
        `Application id=${applicationId} không tồn tại hoặc inactive`,
      );
    }
  }

  async create(
    dto: CreateSupersetApplicationDto,
  ): Promise<SupersetApplication> {
    const existing = await this.applicationModel.findOne({
      name: dto.name,
      env: dto.env,
    });

    if (existing) {
      throw new ConflictException(
        `Application name="${dto.name}" env="${dto.env}" đã tồn tại`,
      );
    }

    const created = await this.applicationModel.create(dto);
    this.logger.log(`Created application: ${dto.name}/${dto.env}`);
    return created.toObject();
  }

  async findAll(): Promise<SupersetApplication[]> {
    return this.applicationModel.find().sort({ createdAt: -1 }).lean();
  }

  async update(
    id: string,
    dto: UpdateSupersetApplicationDto,
  ): Promise<SupersetApplication> {
    if (dto.name || dto.env) {
      const current = await this.applicationModel.findById(id).lean();
      if (!current) {
        throw new NotFoundException(`Application id=${id} không tồn tại`);
      }

      const conflict = await this.applicationModel.findOne({
        _id: { $ne: this.toObjectId(id) },
        name: dto.name ?? current.name,
        env: dto.env ?? current.env,
      });

      if (conflict) {
        throw new ConflictException('Application name/env đã được dùng');
      }
    }

    const updated = await this.applicationModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean();

    if (!updated) {
      throw new NotFoundException(`Application id=${id} không tồn tại`);
    }

    return updated;
  }
}
