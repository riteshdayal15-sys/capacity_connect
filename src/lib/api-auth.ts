import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export type ApiRole = "ADMIN" | "TRAINER" | "TRAINEE";

export interface ApiSession {
  id: string;
  role: ApiRole;
  department?: string;
  email?: string | null;
  specialization?: string;
  assignedBlockId?: string;
  assignedBlockTitle?: string;
}

/**
 * Centralized API authorization guard.
 * Pages are protected by middleware, but /api/* routes are NOT matched by it,
 * so every mutating (and sensitive read) route must call this first.
 *
 * Returns { session } on success or { unauthorized } with a ready-made
 * 401/403 NextResponse on failure.
 */
export async function requireApiAuth(
  allowedRoles?: ApiRole[]
): Promise<{ session: ApiSession } | { unauthorized: NextResponse }> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user?.id) {
    return {
      unauthorized: NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      unauthorized: NextResponse.json(
        { error: "Forbidden. Your role cannot perform this action." },
        { status: 403 }
      ),
    };
  }

  return {
    session: {
      id: user.id,
      role: user.role as ApiRole,
      department: user.department,
      email: user.email,
      specialization: user.specialization,
      assignedBlockId: user.assignedBlockId,
      assignedBlockTitle: user.assignedBlockTitle,
    },
  };
}

/**
 * Ownership check: the acting user may only act on their own record,
 * unless they are ADMIN (trainers can view, not mutate, others' data).
 */
export function ownsRecordOrAdmin(session: ApiSession, targetUserId: string): boolean {
  return session.id === targetUserId || session.role === "ADMIN";
}

/**
 * Subject-specific RBAC check for trainers.
 * Admin has unrestricted access across all subjects.
 * Trainers can only manage courses within their assigned subject pathway AND that they author.
 */
export function canTrainerManageCourse(
  session: ApiSession,
  course: { trainerId: string; competencyBlockId?: string }
): boolean {
  if (session.role === "ADMIN") return true;
  if (session.role !== "TRAINER") return false;

  // Must author the course
  if (course.trainerId !== session.id) return false;

  // If trainer has an assigned subject block, the course must belong to that subject
  if (session.assignedBlockId && course.competencyBlockId) {
    return course.competencyBlockId === session.assignedBlockId;
  }

  return true;
}

/**
 * Validates whether a trainer is authorized to create/publish courses in a given competency block.
 */
export function validateTrainerSubjectAccess(
  session: ApiSession,
  competencyBlockId: string
): { allowed: boolean; reason?: string } {
  if (session.role === "ADMIN") return { allowed: true };
  if (session.role !== "TRAINER") {
    return { allowed: false, reason: "Only trainers and admins can author curricula." };
  }

  if (session.assignedBlockId && session.assignedBlockId !== competencyBlockId) {
    return {
      allowed: false,
      reason: `Forbidden. You are assigned to "${session.specialization || session.assignedBlockTitle || "another specialization"}". You cannot manage courses in this subject.`,
    };
  }

  return { allowed: true };
}

/** Safe public user shape — NEVER include passwordHash. */
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  trainerStatus: true,
  trainerRequestNote: true,
  specialization: true,
  assignedBlockId: true,
  assignedBlock: {
    select: {
      id: true,
      title: true,
      category: true,
    },
  },
  createdAt: true,
} as const;

/**
 * Remove correct quiz answers from course payloads for trainees.
 * TRAINER/ADMIN keep full data (authoring + roster needs it).
 * Trainee quiz scoring happens server-side in /api/assessments/submit,
 * so the client never needs correctOptionIndex.
 */
function stripQuestionsModules(modules: any[]): any[] {
  return (modules || []).map((m) => ({
    ...m,
    assessments: (m.assessments || []).map((a: any) => ({
      ...a,
      questions: (a.questions || []).map((q: any) => {
        const { correctOptionIndex, ...rest } = q;
        return rest;
      }),
    })),
  }));
}

export function sanitizeCourseForRole(course: any, role?: string): any {
  if (!course) return course;
  if (role === "ADMIN" || role === "TRAINER") return course;

  if (Array.isArray(course)) {
    return course.map((c) => (c?.course ? { ...c, course: sanitizeCourseForRole(c.course, role) } : sanitizeCourseForRole(c, role)));
  }
  // Enrollment records nest the course under .course
  if (course.course) {
    return { ...course, course: sanitizeCourseForRole(course.course, role) };
  }

  // Trainees should never receive the entire trainee roster (PII) or quiz answer keys
  const { enrollments, ...safeCourse } = course;
  return { ...safeCourse, modules: stripQuestionsModules(safeCourse.modules) };
}
