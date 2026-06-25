/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) { }

  /*
    async onModuleInit() {
      const users = [
        {
          username: "admin",
          password: "admin",
          roleName: "Admin",
          isActive: true,
          phone: "0364083304"
        },
        {
          username: "saleman",
          password: "saleman",
          roleName: "Saleman",
          isActive: true,
          phone: "0909555888"
        },
      ];

      for (const u of users) {
        await this.create(u);

        this.logger.log(`[${AccountService.name}] Created user: ${u?.username}`)
      }
    }
  */ 

  async create(dto: CreateAccountDto): Promise<Account> {
    try {
      const existingUser = await this.accountModel
      .findOne({ username: dto?.username.toLowerCase(), isActive: true })
      .lean()
      .exec();

      if (existingUser) {
        throw new ConflictException('Username already exists');
      }

      const hashedPassword = await bcrypt.hash(dto?.password, 10);

      const account = new this.accountModel({
        ...dto,
        password: hashedPassword,
      });

      const saved = await account.save();
      this.logger.log(
        `Account created: ${saved.username} [role=${saved.roleName}]`,
      );
      return saved.toObject();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `Account với username '${dto.username}' đã tồn tại`,
        );
      }
      throw error;
    }
  }

  async findAll(
    filter: { roleName?: string; isActive?: boolean } = {},
  ): Promise<Account[]> {
    const query: any = {};

    if (filter.roleName) query.roleName = filter.roleName;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;

    return this.accountModel.find(query).lean().exec();
  }

  async findByUsername(username: string): Promise<AccountDocument> {
    const account = await this.accountModel
      .findOne({ username: username.toLowerCase(), isActive: true })
      .lean()
      .exec();

    if (!account) {
      throw new NotFoundException(
        `Account '${username}' không tồn tại hoặc đã bị vô hiệu hoá`,
      );
    }

    return account;
  }

  async update(username: string, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.accountModel
      .findOneAndUpdate(
        { username: username.toLowerCase() },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();

    if (!account) {
      throw new NotFoundException(`Account '${username}' không tồn tại`);
    }

    this.logger.log(`Account updated: ${username}`);
    return account;
  }

  /** Thay đổi role cho account */
  async changeRole(username: string, roleName: string): Promise<Account> {
    return this.update(username, { roleName });
  }

  async deactivate(username: string): Promise<void> {
    await this.update(username, { isActive: false });
    this.logger.warn(`Account deactivated: ${username}`);
  }

  async remove(username: string): Promise<void> {
    const result = await this.accountModel
      .deleteOne({ username: username.toLowerCase() })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Account '${username}' không tồn tại`);
    }

    this.logger.warn(`Account permanently deleted: ${username}`);
  }
}
