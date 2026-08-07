import { Injectable } from "@nestjs/common";
import { EmailLog } from "@prisma/client";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class EmailLogService {
  constructor(private readonly prisma: PrismaService) {}

  public async log({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailLog> {
    return this.prisma.emailLog.create({ data: { to, subject, html, text } });
  }

  public async findAllPaginated(
    filters: Pick<PaginationDto, "page" | "pageSize">,
  ): Promise<PaginatedResponseDto<EmailLog>> {
    return this.prisma.emailLog.paginate({
      orderBy: { sentAt: "desc" },
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }
}
