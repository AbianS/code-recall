import type { CliRenderer, KeyEvent } from "@opentui/core";
import { BoxRenderable } from "@opentui/core";
import { createHeader } from "./components/header.ts";
import { createStatusBar } from "./components/status-bar.ts";
import type { DataStore } from "./data/store.ts";
import { DashboardScreen } from "./screens/dashboard.ts";
import { EntitiesScreen } from "./screens/entities.ts";
import { MemoriesScreen } from "./screens/memories.ts";
import { MemoryDetailScreen } from "./screens/memory-detail.ts";
import { RuleDetailScreen } from "./screens/rule-detail.ts";
import { RulesScreen } from "./screens/rules.ts";
import { SearchScreen } from "./screens/search.ts";
import { BG_PRIMARY } from "./theme.ts";
import type {
  AppContext,
  NavigateParams,
  Screen,
  ScreenEntry,
  ScreenName,
} from "./types.ts";

const SCREEN_LABELS: Record<ScreenName, string> = {
  dashboard: "Dashboard",
  memories: "Memories",
  "memory-detail": "Memory Detail",
  rules: "Rules",
  "rule-detail": "Rule Detail",
  entities: "Code Entities",
  search: "Search",
};

const SCREEN_HINTS: Partial<Record<ScreenName, string>> = {
  "memory-detail": "Esc:Back  j/k:Scroll",
  "rule-detail": "Esc:Back  j/k:Scroll",
};

export class App implements AppContext {
  renderer: CliRenderer;
  store: DataStore;

  private header: ReturnType<typeof createHeader>;
  private statusBar: ReturnType<typeof createStatusBar>;
  private contentArea: BoxRenderable;
  private currentScreen: Screen | null = null;
  private history: ScreenEntry[] = [];

  constructor(renderer: CliRenderer, store: DataStore, projectPath: string) {
    this.renderer = renderer;
    this.store = store;

    // Build persistent layout frame
    const root = new BoxRenderable(renderer, {
      id: "root",
      width: "100%",
      height: "100%",
      flexDirection: "column",
      backgroundColor: BG_PRIMARY,
    });

    this.header = createHeader(renderer, projectPath);
    this.contentArea = new BoxRenderable(renderer, {
      id: "content-area",
      flexGrow: 1,
      width: "100%",
      flexDirection: "column",
      backgroundColor: BG_PRIMARY,
    });
    this.statusBar = createStatusBar(renderer);

    root.add(this.header.renderable);
    root.add(this.contentArea);
    root.add(this.statusBar.renderable);

    renderer.root.add(root);

    // Global keyboard handler
    renderer.keyInput.on("keypress", (key: KeyEvent) => {
      this.handleGlobalKey(key);
    });
  }

  start() {
    this.navigateTo("dashboard");
  }

  navigateTo(name: ScreenName, params?: NavigateParams) {
    // Push current to history (but not if going back)
    if (this.currentScreen) {
      this.history.push({
        name: this.currentScreen.name,
      });
      if (this.history.length > 10) {
        this.history.shift();
      }
    }

    this.switchScreen(name, params);
  }

  goBack() {
    const prev = this.history.pop();
    if (prev) {
      this.switchScreen(prev.name, prev.params);
    }
  }

  private switchScreen(name: ScreenName, params?: NavigateParams) {
    // Destroy current screen
    if (this.currentScreen) {
      this.currentScreen.destroy();
      this.currentScreen = null;
    }

    // Clear content area children
    for (const child of this.contentArea.getChildren()) {
      child.destroy();
    }
    const screen = this.createScreen(name, params);
    this.currentScreen = screen;

    // Mount
    screen.mount(this.contentArea);

    // Update chrome
    this.header.update(SCREEN_LABELS[name] ?? name);
    this.statusBar.update(SCREEN_HINTS[name]);
  }

  private createScreen(name: ScreenName, params?: NavigateParams): Screen {
    switch (name) {
      case "dashboard":
        return new DashboardScreen(this);
      case "memories":
        return new MemoriesScreen(this, params);
      case "memory-detail":
        return new MemoryDetailScreen(this, params!);
      case "rules":
        return new RulesScreen(this);
      case "rule-detail":
        return new RuleDetailScreen(this, params!);
      case "entities":
        return new EntitiesScreen(this);
      case "search":
        return new SearchScreen(this, params);
      default:
        return new DashboardScreen(this);
    }
  }

  private handleGlobalKey(key: KeyEvent) {
    // Let the current screen handle it first
    if (this.currentScreen?.onKeypress?.(key)) {
      return;
    }

    // Don't process global shortcuts when an input is focused
    if (
      this.renderer.currentFocusedRenderable &&
      "placeholder" in this.renderer.currentFocusedRenderable
    ) {
      return;
    }

    switch (key.name) {
      case "1":
        if (this.currentScreen?.name !== "dashboard") {
          this.navigateTo("dashboard");
        }
        break;
      case "2":
        if (this.currentScreen?.name !== "memories") {
          this.navigateTo("memories");
        }
        break;
      case "3":
        if (this.currentScreen?.name !== "rules") {
          this.navigateTo("rules");
        }
        break;
      case "4":
        if (this.currentScreen?.name !== "entities") {
          this.navigateTo("entities");
        }
        break;
      case "/":
        if (this.currentScreen?.name !== "search") {
          this.navigateTo("search");
        }
        break;
      case "q":
        this.store.close();
        this.renderer.destroy();
        process.exit(0);
        break;
      case "escape":
        this.goBack();
        break;
    }
  }
}
