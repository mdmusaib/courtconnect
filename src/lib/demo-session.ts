import "server-only";

import { cache } from "react";
import { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth-types";
import { demoUserForRole, type DemoRole } from "@/lib/demo-auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns a real database user for the selected demo role, creating it when
 * the seed has not run yet. The deterministic seed ID is reused so every
 * server-rendered page, API route, and foreign key points at the same user.
 *
 * If the database is unreachable we still return an in-memory identity so the
 * UI never blocks on authentication.
 */
export const ensureDemoUser = cache(
  async (role: DemoRole): Promise<SessionUser> => {
    const demo = demoUserForRole(role);

    try {
      const user = await prisma.user.upsert({
        where: { phone: demo.phone },
        update: {
          name: demo.name,
          role: role as Role,
        },
        create: {
          id: demo.id,
          phone: demo.phone,
          name: demo.name,
          role: role as Role,
        },
        select: {
          id: true,
          firebaseUid: true,
          name: true,
          phone: true,
        },
      });

      return {
        id: user.id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        phone: user.phone,
        role,
      };
    } catch (error) {
      console.warn(
        `[demo-session] Could not persist the ${role} demo user; using an in-memory identity.`,
        error instanceof Error ? error.message : error,
      );

      return demo;
    }
  },
);
