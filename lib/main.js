const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-find-ar.threshold", (value) => {
        this.threshold = value;
      }),
      atom.config.observe("scrollmap-find-ar.permanent", (value) => {
        this.permanent = value;
      }),
    );
    this.findModel = null;
    this.findPanel = null;
    this.findPackage = null;
  },

  deactivate() {
    this.findModel = null;
    this.findPanel = null;
    this.findPackage = null;
    this.disposables.dispose();
  },

  isPanelVisible() {
    return this.findPackage?.mainModule?.findPanel?.isVisible?.() ?? true;
  },

  async consumeFindService(service) {
    this.findPackage =
      atom.packages.getLoadedPackage("search-panel") ||
      atom.packages.getLoadedPackage("find-and-replace");
    this.findModel = this.findPackage?.mainModule?.findModel;
    const updateAll = throttle(() => {
      if (!this.findModel) { return }
      for (const editor of atom.workspace.getTextEditors()) {
        const layer = editor.scrollmap?.layers.get('find');
        if (!layer) continue;
        let markers = [];
        if (this.findModel?.editor === editor && (this.permanent || this.isPanelVisible())) {
          markers = this.findModel.markers || [];
        }
        layer.cache.set('data', markers);
        layer.update();
      }
    }, 50);
    let subscriptions = new CompositeDisposable();
    subscriptions.add(this.findModel?.onDidUpdate?.(updateAll));
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.findPanel = this.findPackage?.mainModule?.findPanel;
    subscriptions.add(this.findPanel?.onDidChangeVisible?.(updateAll));
    return new Disposable(() => {
      this.findModel = null;
      this.findPackage = null;
      subscriptions.dispose();
    });
  },

  provideScrollmap() {
    return {
      name: "find",
      description: "Find-and-replace result markers",
      initialize: ({ disposables, update }) => {
        disposables.add(
          atom.config.onDidChange("scrollmap-find-ar.permanent", update),
          atom.config.onDidChange("scrollmap-find-ar.threshold", update),
        );
      },
      getItems: ({ cache }) => {
        const items = (cache.get('data') || []).map((marker) => ({
          row: marker.getScreenRange().start.row,
        }));
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        return items;
      },
    };
  },
};

function throttle(func, timeout) {
  let timer = null;
  return (...args) => {
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, timeout);
  };
}
