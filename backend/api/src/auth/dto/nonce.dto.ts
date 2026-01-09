import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class NonceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Address must be a valid Ethereum address',
  })
  address: string;
}

