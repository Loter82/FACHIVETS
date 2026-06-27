import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Невірний формат email' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль має містити щонайменше 8 символів' })
  password!: string;
}
