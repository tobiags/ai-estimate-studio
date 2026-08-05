import { AiPolicyError } from "./errors.js";
import { assertSafeAiInput, defaultAiPolicy, type AiPolicy } from "./policy.js";

export type PromptTemplate = Readonly<{
  version: string;
  system: string;
  renderUser: (context: string, goal?: string) => string;
}>;

export class PromptRegistry {
  private readonly templates = new Map<string, PromptTemplate>();

  register(template: PromptTemplate): void {
    if (this.templates.has(template.version))
      throw new AiPolicyError(
        "SCHEMA_INVALID",
        `Prompt version already registered: ${template.version}`,
      );
    this.templates.set(template.version, template);
  }

  render(
    version: string,
    context: string,
    goal?: string,
    policy: AiPolicy = defaultAiPolicy,
  ): Readonly<{
    version: string;
    system: string;
    user: string;
    context: string;
  }> {
    const template = this.templates.get(version);
    if (!template)
      throw new AiPolicyError(
        "SCHEMA_INVALID",
        `Unknown prompt version: ${version}`,
      );
    const user = template.renderUser(context, goal);
    assertSafeAiInput({ system: template.system, user, context }, policy);
    return Object.freeze({ version, system: template.system, user, context });
  }
}
