import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/../tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as networking from "@/components/networking";
import ImpactPopover from "./impact_popover";
import { PolicyAttachment } from "@/components/policies/types";

vi.mock("@/components/networking");

vi.mock("@heroicons/react/outline", () => ({
  EyeIcon: function EyeIcon() {
    return null;
  },
}));

vi.mock("@tremor/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tremor/react")>();
  // Re-apply the global Button/Tooltip overrides from tests/setupTests.ts. A file-level
  // vi.mock fully replaces the setup-level mock, so without this the real Tremor Button
  // leaks through and its useTooltip(300) schedules a native setTimeout that can fire
  // post-teardown -> "window is not defined".
  return {
    ...actual,
    Icon: ({
      icon: IconComp,
      onClick,
      className,
    }: {
      icon?: React.ComponentType;
      onClick?: React.MouseEventHandler<HTMLButtonElement>;
      className?: string;
    }) =>
      React.createElement(
        "button",
        { type: "button", onClick, className },
        IconComp?.displayName ?? IconComp?.name ?? "icon",
      ),
    Button: React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button">>(
      ({ children, ...props }, ref) => React.createElement("button", { ...props, ref }, children),
    ),
    Tooltip: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

// Expose the Popover's onOpenChange so tests can trigger it programmatically.
vi.mock("antd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd")>();
  return {
    ...actual,
    Popover: ({
      children,
      onOpenChange,
      content,
    }: React.PropsWithChildren<{ onOpenChange?: (open: boolean) => void; content?: React.ReactNode }>) =>
      React.createElement(
        "div",
        null,
        React.createElement("div", { "data-testid": "popover-content" }, content),
        React.createElement(
          "div",
          {
            role: "button",
            "aria-label": "open-popover",
            onClick: () => onOpenChange?.(true),
          },
          children,
        ),
      ),
    Tooltip: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    Spin: () => React.createElement("span", null, "Loading..."),
    Tag: ({ children }: React.PropsWithChildren) => React.createElement("span", null, children),
  };
});

const makeAttachment = (overrides: Partial<PolicyAttachment> = {}): PolicyAttachment => ({
  attachment_id: "att-001",
  policy_name: "my-policy",
  scope: null,
  teams: [],
  keys: [],
  models: [],
  tags: [],
  ...overrides,
});

function impact(keys: number, teams: number, sampleKeys: string[] = [], sampleTeams: string[] = []) {
  return { affected_keys_count: keys, affected_teams_count: teams, sample_keys: sampleKeys, sample_teams: sampleTeams };
}

describe("ImpactPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render", () => {
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    expect(screen.getByRole("button", { name: /open-popover/i })).toBeInTheDocument();
  });

  it("should show 'Click to load' as the initial popover content", () => {
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    expect(screen.getByText(/click to load/i)).toBeInTheDocument();
  });

  it("should call estimateAttachmentImpactCall when the popover is opened", async () => {
    const user = userEvent.setup();
    vi.mocked(networking.estimateAttachmentImpactCall).mockResolvedValue(impact(0, 0));
    const attachment = makeAttachment({ policy_name: "rate-limit", teams: ["team-a"] });
    renderWithProviders(<ImpactPopover attachment={attachment} accessToken="my-token" />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    await waitFor(() => {
      const expectedAttachment = {
        policy_name: "rate-limit",
        scope: null,
        teams: ["team-a"],
        keys: [],
        models: [],
        tags: [],
      };
      expect(networking.estimateAttachmentImpactCall).toHaveBeenCalledWith("my-token", expectedAttachment);
    });
  });

  it("should not call the API when accessToken is null", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken={null} />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    expect(networking.estimateAttachmentImpactCall).not.toHaveBeenCalled();
  });

  it("should show a loading indicator while the impact is being fetched", async () => {
    const user = userEvent.setup();
    vi.mocked(networking.estimateAttachmentImpactCall).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    // Multiple "Loading..." nodes exist (Spin + adjacent text) — assert at least one is present
    expect(screen.queryAllByText(/loading/i).length).toBeGreaterThan(0);
  });

  it("should show a global scope warning when affected_keys_count is -1", async () => {
    const user = userEvent.setup();
    vi.mocked(networking.estimateAttachmentImpactCall).mockResolvedValue(impact(-1, -1));
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    expect(await screen.findByText(/global scope.*affects all keys and teams/i)).toBeInTheDocument();
  });

  it("should show key and team counts when impact data is loaded for a specific scope", async () => {
    const user = userEvent.setup();
    vi.mocked(networking.estimateAttachmentImpactCall).mockResolvedValue(impact(5, 2, ["sk-abc"], ["team-x"]));
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    expect(await screen.findByText(/5/)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it("should render sample key tags when returned from the API", async () => {
    const user = userEvent.setup();
    vi.mocked(networking.estimateAttachmentImpactCall).mockResolvedValue(impact(2, 0, ["sk-key-one", "sk-key-two"]));
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    expect(await screen.findByText("sk-key-one")).toBeInTheDocument();
    expect(screen.getByText("sk-key-two")).toBeInTheDocument();
  });

  it("should show 'No keys or teams currently affected' when both counts are 0", async () => {
    const user = userEvent.setup();
    vi.mocked(networking.estimateAttachmentImpactCall).mockResolvedValue(impact(0, 0));
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    expect(await screen.findByText(/no keys or teams currently affected/i)).toBeInTheDocument();
  });

  it("should not call the API a second time when the popover is already loaded", async () => {
    const user = userEvent.setup();
    vi.mocked(networking.estimateAttachmentImpactCall).mockResolvedValue(impact(1, 0, ["sk-abc"]));
    renderWithProviders(<ImpactPopover attachment={makeAttachment()} accessToken="tok" />);
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    await screen.findByText("sk-abc");
    await user.click(screen.getByRole("button", { name: /open-popover/i }));
    expect(networking.estimateAttachmentImpactCall).toHaveBeenCalledTimes(1);
  });
});
