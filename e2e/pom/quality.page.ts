import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class QualityPage extends BasePage {
  private root = () => this.byTestId("quality-page");

  async open(): Promise<void> {
    await this.goto("/qualite-generale");
    await expect(this.root()).toBeVisible();
  }

  async expectTitle(): Promise<void> {
    await expect(this.byTestId("quality-page-title")).toContainText(
      "Qualité générale",
    );
  }

  async expectGlobalStats(): Promise<void> {
    await expect(this.byTestId("global-stats-data")).toBeVisible({
      timeout: 15000,
    });
    await expect(this.byTestId("global-stats-item-0")).toBeVisible();
  }

  async expectIqChart(): Promise<void> {
    await expect(this.byTestId("applications-iq-chart-canvas")).toBeAttached({
      timeout: 15000,
    });
  }

  async toggleIqChartView(): Promise<void> {
    await this.byTestId("applications-iq-chart-toggle-view").click();
  }

  async expectIqChartCanvasVisible(): Promise<void> {
    await expect(this.byTestId("applications-iq-chart-canvas")).toBeVisible();
  }

  async expectIqChartTableVisible(): Promise<void> {
    const table = this.byTestId("applications-iq-chart-table");
    await expect(table).toBeAttached();
    await expect(table.locator("table")).toBeVisible();
  }

  async expectIqTrendChart(): Promise<void> {
    await expect(this.byTestId("iq-chart-canvas")).toBeAttached({
      timeout: 15000,
    });
  }

  async toggleIqTrendView(): Promise<void> {
    await this.byTestId("iq-chart-toggle-view").click();
  }

  async setIqTrendGroupBy(value: string): Promise<void> {
    await this.byTestId("iq-chart-groupby-select").selectOption(value);
  }

  async expectNoIqTrendError(): Promise<void> {
    await expect(this.byTestId("iq-chart-error")).toBeHidden();
  }
}

export class TimePage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/time");
    await expect(this.byTestId("time-view")).toBeVisible();
  }

  async expectTitle(): Promise<void> {
    await expect(this.byTestId("time-title")).toContainText("Diagramme Time");
  }

  async expectChartSection(): Promise<void> {
    await expect(this.byTestId("technical-debt-chart-section")).toBeVisible();
  }

  async expectFilters(): Promise<void> {
    await expect(this.byTestId("sidebar-filter")).toBeVisible();
  }
}

export class HistoryPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/historique");
    await expect(
      this.page.getByRole("heading", { name: /Modifications/i }),
    ).toBeVisible();
  }

  async expectFiltersVisible(): Promise<void> {
    await expect(this.byTestId("history-filter-date-from")).toBeVisible();
    await expect(this.byTestId("history-filter-date-to")).toBeVisible();
  }

  async expectTableOrEmpty(): Promise<void> {
    await expect(
      this.byTestId("history-pagination-footer").or(
        this.byTestId("history-empty"),
      ),
    ).toBeVisible({ timeout: 15000 });
  }

  async applyFilters(): Promise<void> {
    await this.byTestId("history-apply-filters").click();
  }

  async clearFilters(): Promise<void> {
    await this.byTestId("history-clear-filters").click();
  }

  async hasRows(): Promise<boolean> {
    return this.byTestId("history-pagination-footer").isVisible();
  }
}
