import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Hoisted shared mocks (safe to use inside vi.mock factories) ----
const { keyUpdateCallMock, keyDeleteCallMock, mockUseAuthorized, formState } = vi.hoisted(() => {
  return {
    keyUpdateCallMock: vi.fn().mockResolvedValue({}),
    keyDeleteCallMock: vi.fn().mockResolvedValue({}),
    mockUseAuthorized: vi.fn(),
    formState: { values: {} as Record<string, unknown> },
  };
});

// ---- Module mocks ----

// Mock useAuthorized hook FIRST (before component imports it)
vi.mock("@/app/(dashboard)/hooks/useAuthorized", () => ({
  default: mockUseAuthorized,
}));

// Networking: wire the hoisted fns so we can assert calls later
vi.mock("../networking", () => {
  return {
    keyUpdateCall: (...args: Parameters<typeof import("../networking").keyUpdateCall>) => keyUpdateCallMock(...args),
    keyDeleteCall: (...args: Parameters<typeof import("../networking").keyDeleteCall>) => keyDeleteCallMock(...args),
  };
});

// Notifications
vi.mock("../molecules/notifications_manager", () => {
  const Notifications = {
    success: vi.fn(),
    error: vi.fn(),
    fromBackend: vi.fn(),
  };
  return { default: Notifications };
});

// Roles: ensure 'Admin' has write access and include all role helper functions
vi.mock("../../utils/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/roles")>();
  return {
    ...actual,
    rolesWithWriteAccess: ["Admin"],
  };
});

// Helpers used in rendering
vi.mock("@/utils/dataUtils", () => ({
  copyToClipboard: async () => true,
  formatNumberWithCommas: (n: unknown) => String(n),
}));
vi.mock("../key_info_utils", () => ({
  extractLoggingSettings: () => ({}),
  formatMetadataForDisplay: (m: unknown) => JSON.stringify(m, null, 2),
  stripTagsFromMetadata: (m: unknown) => m,
}));
vi.mock("../callback_info_helpers", () => ({
  callback_map: {},
  mapInternalToDisplayNames: (x: unknown) => x,
  mapDisplayToInternalNames: (x: unknown) => x,
}));
vi.mock("../shared/errorUtils", () => ({
  parseErrorMessage: (e: unknown) => String(e),
}));

// Tremor components -> async factory, local React import, and named passthroughs
vi.mock("@tremor/react", async () => {
  const React = await import("react");

  const makeNamedPassthrough = (tag: "div" | "span" | "h1", name: string) => {
    function Named(props: ComponentProps<"div">) {
      const { children, ...rest } = props;
      return React.createElement(tag, rest, children);
    }
    Named.displayName = name;
    return Named;
  };

  const Card = makeNamedPassthrough("div", "Card");
  const Text = makeNamedPassthrough("span", "Text");
  const Grid = makeNamedPassthrough("div", "Grid");
  const Col = makeNamedPassthrough("div", "Col");
  const TabGroup = makeNamedPassthrough("div", "TabGroup");
  const TabList = makeNamedPassthrough("div", "TabList");
  const TabPanels = makeNamedPassthrough("div", "TabPanels");
  const TabPanel = makeNamedPassthrough("div", "TabPanel");
  const Title = makeNamedPassthrough("h1", "Title");
  const Badge = makeNamedPassthrough("span", "Badge");

  function Button(props: ComponentProps<"button">) {
    const { children, onClick, ...rest } = props;
    return React.createElement("button", { onClick, ...rest }, children);
  }
  Button.displayName = "Button";

  function Tab(props: ComponentProps<"button">) {
    const { children, ...rest } = props;
    return React.createElement("button", { ...rest }, children);
  }
  Tab.displayName = "Tab";

  function TextInput(props: ComponentProps<"input">) {
    return React.createElement("input", { ...props });
  }
  TextInput.displayName = "TextInput";

  function TremorSelect(props: ComponentProps<"select">) {
    return React.createElement("select", { ...props });
  }
  TremorSelect.displayName = "TremorSelect";

  return {
    Card,
    Text,
    Button,
    Grid,
    Col,
    Tab,
    TabList,
    TabGroup,
    TabPanel,
    TabPanels,
    Title,
    Badge,
    TextInput,
    Select: TremorSelect,
  };
});

// antd bits -> async factory & local React
vi.mock("antd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd")>();

  const React = await import("react");

  const Form = { useForm: () => [{}] };

  function Input(props: ComponentProps<"input">) {
    return React.createElement("input", { ...props });
  }
  Input.displayName = "AntdInput";

  function InputNumber(props: ComponentProps<"input">) {
    return React.createElement("input", { ...props });
  }
  InputNumber.displayName = "AntdInputNumber";

  function Select(props: ComponentProps<"select">) {
    return React.createElement("select", { ...props });
  }
  Select.displayName = "AntdSelect";

  function Tooltip({ children }: { children: ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  }
  Tooltip.displayName = "AntdTooltip";

  function Button(props: ComponentProps<"button">) {
    const { children, onClick, ...rest } = props;
    return React.createElement("button", { onClick, ...rest }, children);
  }
  Button.displayName = "AntdButton";

  return { ...actual, Form, Input, InputNumber, Select, Tooltip, Button };
});

// Icons -> async factory & local React
vi.mock("@heroicons/react/outline", async () => {
  const React = await import("react");
  function ArrowLeftIcon() {
    return React.createElement("span");
  }
  ArrowLeftIcon.displayName = "ArrowLeftIcon";
  function TrashIcon() {
    return React.createElement("span");
  }
  TrashIcon.displayName = "TrashIcon";
  function RefreshIcon() {
    return React.createElement("span");
  }
  RefreshIcon.displayName = "RefreshIcon";
  return { ArrowLeftIcon, TrashIcon, RefreshIcon };
});

vi.mock("lucide-react", async () => {
  const React = await import("react");
  function CopyIcon() {
    return React.createElement("span");
  }
  CopyIcon.displayName = "CopyIcon";
  function CheckIcon() {
    return React.createElement("span");
  }
  CheckIcon.displayName = "CheckIcon";
  return { CopyIcon, CheckIcon };
});

// Heavy children -> async factories & local React
vi.mock("../organisms/RegenerateKeyModal", async () => {
  const React = await import("react");
  function RegenerateKeyModal() {
    return null;
  }
  RegenerateKeyModal.displayName = "RegenerateKeyModal";
  return { RegenerateKeyModal };
});
vi.mock("../object_permissions_view", async () => {
  const React = await import("react");
  function ObjectPermissionsView() {
    return null;
  }
  ObjectPermissionsView.displayName = "ObjectPermissionsView";
  return { __esModule: true, default: ObjectPermissionsView };
});
vi.mock("../logging_settings_view", async () => {
  const React = await import("react");
  function LoggingSettingsView() {
    return null;
  }
  LoggingSettingsView.displayName = "LoggingSettingsView";
  return { __esModule: true, default: LoggingSettingsView };
});
vi.mock("../common_components/AutoRotationView", async () => {
  const React = await import("react");
  function AutoRotationView() {
    return null;
  }
  AutoRotationView.displayName = "AutoRotationView";
  return { __esModule: true, default: AutoRotationView };
});

// Mock Next.js router to avoid "invariant expected app router to be mounted" error
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock useTeams hook
vi.mock("@/app/(dashboard)/hooks/useTeams", () => ({
  default: vi.fn(() => ({
    teams: [],
    setTeams: vi.fn(),
  })),
}));

// Mock useProjects hook
vi.mock("@/app/(dashboard)/hooks/projects/useProjects", () => ({
  useProjects: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

// Mock useUISettings hook
vi.mock("@/app/(dashboard)/hooks/uiSettings/useUISettings", () => ({
  useUISettings: vi.fn().mockReturnValue({ data: { values: {} }, isLoading: false }),
}));

// Mock useResetKeySpend hook (requires QueryClientProvider which is not available in this test)
vi.mock("@/app/(dashboard)/hooks/keys/useResetKeySpend", () => ({
  useResetKeySpend: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// useQueryClient also needs a provider; the delete-path invalidation is covered in key_info_view.test.tsx
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

// KeyEditView mock: triggers onSubmit with our injected form values
vi.mock("./key_edit_view", async () => {
  const React = await import("react");
  function KeyEditView(props: { onSubmit: (values: Record<string, unknown>) => void }) {
    return React.createElement(
      "div",
      null,
      React.createElement(
        "button",
        {
          onClick: () => props.onSubmit(formState.values),
        },
        "Mock Submit",
      ),
    );
  }
  KeyEditView.displayName = "KeyEditViewMock";
  return { KeyEditView };
});

// ---- SUT import AFTER mocks ----
import KeyInfoView from "./key_info_view";

// ---- Test data helpers ----
const baseKeyData = {
  token_id: "tok_123",
  token: "tok_123",
  key_alias: "My Virtual Key",
  key_name: "sk-xxxx",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  spend: 0,
  max_budget: null,
  tpm_limit: null,
  rpm_limit: null,
  models: [] as string[],
  metadata: {},
  object_permission: {},
  auto_rotate: false,
  rotation_interval: null,
  last_rotation_at: null,
  key_rotation_at: null,
  next_rotation_at: null,
};

function setAuthorizedUser(userRole: string, premiumUser: boolean) {
  const authorization = {
    accessToken: "access_abc",
    userId: "user_1",
    userRole,
    premiumUser,
    token: "token_123",
    userEmail: "test@example.com",
    disabledPersonalKeyCreation: false,
    showSSOBanner: false,
  };
  mockUseAuthorized.mockReturnValue(authorization);
}

const renderView = (premiumUser: boolean) => {
  setAuthorizedUser("Admin", premiumUser);
  return render(
    <KeyInfoView
      keyId="tok_123"
      onClose={() => {}}
      keyData={baseKeyData as any}
      onKeyDataUpdate={() => {}}
      teams={[]}
    />,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  formState.values = {};
});

// ---- Tests ----
describe("KeyInfoView handleKeyUpdate guardrails guard", () => {
  it("should remove guardrails & prompts for non-premium key owner without write access role", async () => {
    const keyDataWithOwner = { ...baseKeyData, user_id: "user_1" };
    setAuthorizedUser("viewer", false);

    render(
      <KeyInfoView
        keyId="tok_123"
        onClose={() => {}}
        keyData={keyDataWithOwner as any}
        onKeyDataUpdate={() => {}}
        teams={[]}
      />,
    );

    fireEvent.click(screen.getByText("Settings"));
    fireEvent.click(screen.getByText("Edit Settings"));
    formState.values = {
      token: "tok_123",
      guardrails: ["gr-1", "gr-2"],
      prompts: ["fast", "safe"],
      metadata: {},
    };

    fireEvent.click(screen.getByText("Mock Submit"));

    await waitFor(() => expect(keyUpdateCallMock).toHaveBeenCalled());

    const [sentAccessToken, sentPayload] = keyUpdateCallMock.mock.calls[0];
    expect(sentAccessToken).toBe("access_abc");

    expect("guardrails" in sentPayload).toBe(false);
    expect("prompts" in sentPayload).toBe(false);
    expect(sentPayload.metadata?.guardrails).toBeUndefined();
    expect(sentPayload.key).toBe("tok_123");
  });

  it("should preserve guardrails & prompts for non-premium users with write access role (e.g. Admin)", async () => {
    renderView(false); // premiumUser = false, userRole = "Admin"

    fireEvent.click(screen.getByText("Settings"));
    fireEvent.click(screen.getByText("Edit Settings"));
    formState.values = {
      token: "tok_123",
      guardrails: ["gr-1"],
      prompts: ["fast"],
      metadata: {},
    };

    fireEvent.click(screen.getByText("Mock Submit"));

    await waitFor(() => expect(keyUpdateCallMock).toHaveBeenCalled());

    const [, sentPayload] = keyUpdateCallMock.mock.calls[0];

    expect(sentPayload.guardrails).toEqual(["gr-1"]);
    expect(sentPayload.prompts).toEqual(["fast"]);
    expect(sentPayload.metadata?.guardrails).toEqual(["gr-1"]);
    expect(sentPayload.key).toBe("tok_123");
  });

  it("should preserve guardrails & prompts for premium users and includes metadata.guardrails", async () => {
    renderView(true); // premiumUser = true

    fireEvent.click(screen.getByText("Settings"));
    fireEvent.click(screen.getByText("Edit Settings"));
    formState.values = {
      token: "tok_123",
      guardrails: ["gr-1"],
      prompts: ["fast"],
      metadata: {},
    };

    fireEvent.click(screen.getByText("Mock Submit"));

    await waitFor(() => expect(keyUpdateCallMock).toHaveBeenCalled());

    const [, sentPayload] = keyUpdateCallMock.mock.calls[0];

    expect(sentPayload.guardrails).toEqual(["gr-1"]);
    expect(sentPayload.prompts).toEqual(["fast"]);
    expect(sentPayload.metadata?.guardrails).toEqual(["gr-1"]);
    expect(sentPayload.key).toBe("tok_123");
  });
});

describe("KeyInfoView handleKeyUpdate empty strings", () => {
  ["tpm_limit", "rpm_limit", "max_parallel_requests", "max_budget"].forEach((limit) => {
    it(`maps empty strings to null for ${limit}`, async () => {
      renderView(true); // premiumUser = true

      fireEvent.click(screen.getByText("Settings"));
      fireEvent.click(screen.getByText("Edit Settings"));
      formState.values = {
        token: "tok_123",
        [limit]: "",
      };

      fireEvent.click(screen.getByText("Mock Submit"));

      await waitFor(() => expect(keyUpdateCallMock).toHaveBeenCalled());

      const [sentAccessToken, sentPayload] = keyUpdateCallMock.mock.calls[0];
      expect(sentAccessToken).toBe("access_abc");
      expect(sentPayload[limit]).toBeNull();
    });
  });
});
