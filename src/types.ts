/** Result of analysing a Lovable project */
export interface AnalysisResult {
  /** Path to the project root */
  projectPath: string;
  /** Lovable-specific dependencies found in package.json */
  lovableDeps: LovableDependency[];
  /** Files containing Lovable-specific imports or references */
  lovableFiles: LovableFileReference[];
  /** SQL migration analysis */
  migrations: MigrationAnalysis;
  /** Supabase schema summary */
  supabaseSchema: SupabaseSchemaSummary;
  /** Capacitor configuration (if present) */
  capacitor: CapacitorConfig | null;
  /** Overall risk assessment */
  risk: RiskAssessment;
}

export interface LovableDependency {
  name: string;
  version: string;
  type: "dependency" | "devDependency";
}

export interface LovableFileReference {
  filePath: string;
  /** What kind of Lovable reference was found */
  referenceType:
    | "import"
    | "oauth-call"
    | "deep-link"
    | "og-image"
    | "domain"
    | "tagger";
  /** Line number where the reference was found */
  line: number;
  /** The matching line content */
  content: string;
}

export interface MigrationAnalysis {
  /** Total number of migration files */
  fileCount: number;
  /** Issues found in migration files */
  issues: MigrationIssue[];
}

export interface MigrationIssue {
  filePath: string;
  line: number;
  type:
    | "missing-if-not-exists"
    | "missing-cascade"
    | "unsafe-jsonb-set"
    | "invalid-enum"
    | "missing-column-in-rls";
  description: string;
  /** Suggested fix */
  fix: string;
}

export interface SupabaseSchemaSummary {
  tables: string[];
  views: string[];
  functions: string[];
  enums: string[];
}

export interface CapacitorConfig {
  appId: string;
  appName: string;
  /** Whether deep links use the Lovable scheme */
  hasLovableDeepLinks: boolean;
}

export type RiskLevel = "simple" | "moderate" | "complex";

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
}
