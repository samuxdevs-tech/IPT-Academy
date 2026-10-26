export interface MockStudentProgress {
  completedLessons: string[];
  passedQuizzes: Record<string, number>; // quizId -> score (0 - 5.0)
  activeModuleId: string;
  progressPercent: number;
}

export interface ConditionalRule {
  targetId: string; // ej: 'modulo-2' o 'les-2-1'
  targetTitle: string;
  requiredQuizOrExamId: string;
  requiredQuizTitle: string;
  minScore: number; // ej: 4.0
}

export const DEFAULT_CONDITIONALS: ConditionalRule[] = [];

export class MockStudentManager {
  private progress: MockStudentProgress;
  private conditionals: ConditionalRule[];

  constructor(customConditionals?: ConditionalRule[]) {
    this.conditionals = customConditionals || DEFAULT_CONDITIONALS;
    this.progress = {
      completedLessons: [],
      passedQuizzes: {},
      activeModuleId: 'modulo-1',
      progressPercent: 0,
    };
  }

  public getProgress(): MockStudentProgress {
    const totalCount = 16;
    const completedCount = this.progress.completedLessons.length;
    const progressPercent = Math.min(100, Math.round((completedCount / totalCount) * 100));
    return { ...this.progress, progressPercent };
  }

  public resetProgress(): void {
    this.progress = {
      completedLessons: [],
      passedQuizzes: {},
      activeModuleId: 'modulo-1',
      progressPercent: 0,
    };
  }

  public isLocked(targetId: string): { locked: boolean; reason?: string } {
    const rule = this.conditionals.find(
      c => c.targetId === targetId || c.targetTitle.toLowerCase() === targetId.toLowerCase()
    );
    if (!rule) {
      return { locked: false };
    }

    const currentScore = this.progress.passedQuizzes[rule.requiredQuizOrExamId];
    if (currentScore === undefined || currentScore < rule.minScore) {
      return {
        locked: true,
        reason: `Contenido bloqueado: Debes aprobar '${rule.requiredQuizTitle}' con una nota mínima de ${rule.minScore.toFixed(1)}/5.0 (Puntaje actual: ${currentScore !== undefined ? currentScore.toFixed(1) : 'No presentado'}).`
      };
    }

    return { locked: false };
  }

  public isTargetLocked(targetIdOrTitle: string): boolean {
    return this.isLocked(targetIdOrTitle).locked;
  }

  public simulateCompleteLesson(lessonId: string): void {
    if (!this.progress.completedLessons.includes(lessonId)) {
      this.progress.completedLessons.push(lessonId);
    }
  }

  public simulatePassQuiz(quizId: string, score: number): void {
    this.progress.passedQuizzes[quizId] = score;
  }
}
