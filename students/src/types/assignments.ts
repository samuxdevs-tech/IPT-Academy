export interface RubricCriterion {
  id: string;
  title: string;
  weightPercent: number;
  description: string;
  maxPoints: number;
  awardedPoints?: number;
  teacherComment?: string;
}

export interface AssignmentItem {
  id: string;
  code: string;
  courseSlug: string;
  courseTitle: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'appealed';
  description: string;
  deliverablesExpected: string[];
  rubric: RubricCriterion[];
  finalScore?: number;
  teacherGeneralFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  submittedAssets?: {
    textNotes: string;
    repoUrl?: string;
    files: { name: string; sizeMb: number; type: string }[];
    voiceNoteDurationSec?: number;
    submittedAt: string;
  };
  appealRecord?: {
    folio: string;
    criterionId: string;
    criterionTitle: string;
    reason: string;
    status: 'pending_rectoria' | 'resolved';
    createdAt: string;
  };
}
