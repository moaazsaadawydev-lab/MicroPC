import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateEmailDto {
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;

  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty()
  password: string;
}
