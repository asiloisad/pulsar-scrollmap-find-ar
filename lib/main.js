const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  activate() {
    this.editors = new Map();
    this.findModel = null;
  },

  deactivate() {
    this.editors.clear();
    this.findModel = null;
  },

  consumeFindService(service) {
    const findPackage =
      atom.packages.getLoadedPackage("find-and-replace-plus") ||
      atom.packages.getLoadedPackage("find-and-replace");
    this.findModel = findPackage?.mainModule?.findModel;

    const updateAll = () => {
      for (const ctx of this.editors.values()) {
        ctx.update();
      }
    };

    let modelSubscription = this.findModel?.onDidUpdate?.(updateAll);
    let panelSubscription = atom.workspace.onDidAddBottomPanel?.((event) => {
      event.panel.onDidChangeVisible?.(updateAll);
    });

    return new Disposable(() => {
      this.findModel = null;
      modelSubscription?.dispose();
      panelSubscription?.dispose();
    });
  },

  provideScrollmap() {
    const self = this;
    return {
      name: "find",
      subscribe: (editor, update) => {
        self.editors.set(editor, { update });
        return new Disposable(() => self.editors.delete(editor));
      },
      recalculate: (editor) => {
        if (!self.findModel || self.findModel.editor !== editor) {
          return [];
        }
        if (!atom.config.get("scrollmap-find-ar.permanent") && !self.isPanelVisible()) {
          return [];
        }
        const markers = self.findModel.markers || [];
        return markers.map((marker) => ({
          row: marker.getScreenRange().start.row,
        }));
      },
    };
  },

  isPanelVisible() {
    const findPackage =
      atom.packages.getLoadedPackage("find-and-replace-plus") ||
      atom.packages.getLoadedPackage("find-and-replace");
    return findPackage?.mainModule?.findPanel?.isVisible?.() ?? true;
  },
};
