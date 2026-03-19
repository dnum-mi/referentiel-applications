import type { RelationApplicationDto, RelationDto } from "@/client";

export type RelationCreate = RelationApplicationDto & Pick<RelationDto, "applicationSourceId">;
export type RelationUpdate = RelationCreate & Pick<RelationDto, "id">;
export type RelationDelete = Pick<RelationDto, "applicationSourceId" | "applicationTargetId">;
