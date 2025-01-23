import { PartialType } from "@nestjs/mapped-types";
import { IsNotEmpty } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class FullUpdateUserDto extends PartialType(CreateUserDto) {
    @IsNotEmpty()
    _id: string;
}