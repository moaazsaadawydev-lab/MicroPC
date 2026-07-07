import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from '../users.service';
import { AuthGuard } from 'src/Guards/Auth.guard';
import { AuthRoleGuard } from 'src/Guards/AuthRole.guard';
import { Roles } from 'src/decorators/UserRoles.decorator';
import { UserRole } from 'src/utils/enums';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('users/auth')
export class GetterController {
  constructor(private readonly usersService: UsersService) {}

  @Get('all-users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseGuards(AuthGuard, AuthRoleGuard)
  async GetAllUsers() {
    return this.usersService.GetAllUsers();
  }

  @Get('current-user')
  @UseGuards(AuthGuard)
  async CurrentUser(@CurrentUser() user: User) {
    return this.usersService.CurrentUser(user.id);
  }
}
