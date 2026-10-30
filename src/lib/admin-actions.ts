import "server-only";

import {
  AdminActionType,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function requireAdminSession() {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "ADMIN") {
    throw new Error("ADMIN_ACCESS_REQUIRED");
  }

  return admin;
}

export interface AdminActionInput {
  adminId: string;
  action: AdminActionType;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

export function createAdminAction(
  client: Prisma.TransactionClient | typeof prisma,
  input: AdminActionInput,
) {
  return client.adminAction.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}
