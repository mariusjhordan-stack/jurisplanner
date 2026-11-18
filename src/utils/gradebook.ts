import type { Evaluation, Tag } from '../types';
import planEstudios from '../data/plan-estudios.json';
import { COURSE_COLOR_PALETTE } from './courseColors';

export interface GradeCourse {
  id: string;
  name: string;
  color: string;
  credits: number | null;
  official: boolean;
}

export interface CourseGradeSummary {
  accumulated: number;
  evaluatedWeight: number;
  remainingWeight: number;
  totalWeight: number;
  average: number | null;
  neededGrade: number | null;
  alreadyPassed: boolean;
  unreachable: boolean;
}

export function getGradeCourses(tags: Tag[], selectedCiclo: number | null): GradeCourse[] {
  const cycle = selectedCiclo === null
    ? undefined
    : planEstudios.ciclos.find((item) => item.ciclo === selectedCiclo);
  const officialCourses = cycle?.cursos.map((course, index) => {
    const id = `course-${selectedCiclo}-${index}`;
    const tag = tags.find((item) => item.id === id);
    return {
      id,
      name: tag?.name ?? course.nombre,
      color: tag?.color ?? COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length].value,
      credits: course.creditos,
      official: true,
    };
  }) ?? [];
  const customCourses = tags
    .filter((tag) => !tag.isPersonal && !tag.id.startsWith('course-'))
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      credits: null,
      official: false,
    }));

  return [...officialCourses, ...customCourses];
}

export function getCourseGradeSummary(
  evaluations: Evaluation[],
  gradingScaleMax: number,
  passingGrade: number,
): CourseGradeSummary {
  const graded = evaluations.filter((evaluation) => evaluation.grade !== null);
  const evaluatedWeight = graded.reduce((sum, evaluation) => sum + evaluation.weight, 0);
  const totalWeight = evaluations.reduce((sum, evaluation) => sum + evaluation.weight, 0);
  const remainingWeight = Math.max(0, 100 - evaluatedWeight);
  const accumulated = graded.reduce(
    (sum, evaluation) => sum + (evaluation.grade ?? 0) * evaluation.weight / 100,
    0,
  );
  const average = evaluatedWeight > 0 ? accumulated * 100 / evaluatedWeight : null;
  const alreadyPassed = accumulated >= passingGrade;
  const neededGrade = remainingWeight > 0
    ? (passingGrade - accumulated) / (remainingWeight / 100)
    : null;

  return {
    accumulated,
    evaluatedWeight,
    remainingWeight,
    totalWeight,
    average,
    neededGrade,
    alreadyPassed,
    unreachable: totalWeight > 0 && !alreadyPassed && (
      remainingWeight <= 0 || (neededGrade !== null && neededGrade > gradingScaleMax)
    ),
  };
}

export function getCycleAverage(
  courses: GradeCourse[],
  evaluations: Evaluation[],
  gradingScaleMax: number,
  passingGrade: number,
): number | null {
  let weightedTotal = 0;
  let creditTotal = 0;

  courses.filter((course) => course.official && course.credits !== null).forEach((course) => {
    const courseEvaluations = evaluations.filter((evaluation) => evaluation.courseId === course.id);
    const summary = getCourseGradeSummary(courseEvaluations, gradingScaleMax, passingGrade);
    if (summary.average === null || course.credits === null) return;
    weightedTotal += summary.average * course.credits;
    creditTotal += course.credits;
  });

  return creditTotal > 0 ? weightedTotal / creditTotal : null;
}

export function formatGrade(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
