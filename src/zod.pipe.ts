import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType, z } from 'zod';

export class ZodPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return result.data as z.infer<T>;
  }
}
