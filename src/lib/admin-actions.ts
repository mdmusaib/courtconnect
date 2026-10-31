import "server-only";

import {
  AdminActionType,
  type Prisma,
} from "@prisma/client";
import { ensureDemoUser } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/**
 * Admin actions always have an attributable user in this testing build. When
 * the cookie is missing or belongs to another role, the seeded platform admin
 * is used so dispute, refund, and venue actions execute without a 403.
 */
export async function requireAdminSession() {
  const admin = await getSessionUser();

  if (admin?.role === "ADMIN") {
    return admin;
  }

  return ensureDemoUser("ADMIN");
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
