// Background/palette theming: 5 built-in presets + custom presets generated from a single
// hue picked on a color wheel. Every preset (built-in or custom) is really just a set of
// values for the same CSS variables style.css already reads, so applying one is just writing
// them onto :root -- no separate light/dark stylesheets to maintain.
window.WT = window.WT || {};

WT.theme = (function () {
  const VARS = [
    'parchment', 'parchment-dark', 'gold', 'gold-dark',
    'green', 'blue', 'red', 'orange', 'ink', 'card-bg', 'card-border',
  ];

  const PRESETS = {
    parchment: {
      name: 'Parchment Gold',
      colors: {
        parchment: '#F5E6C8', 'parchment-dark': '#EAD8AC', gold: '#E8A93C', 'gold-dark': '#C98A22',
        green: '#4C9A5B', blue: '#4FA8D8', red: '#D64545', orange: '#D97B29',
        ink: '#4A3620', 'card-bg': '#FBF3DE', 'card-border': '#C9A96A',
      },
    },
    forest: {
      name: 'Forest Oath',
      colors: {
        parchment: '#E3EFD3', 'parchment-dark': '#D2E3BC', gold: '#D9A441', 'gold-dark': '#B8842A',
        green: '#2F6B3A', blue: '#3E8FA0', red: '#B84B3E', orange: '#C97B2E',
        ink: '#2E3B1F', 'card-bg': '#F1F7E6', 'card-border': '#8FAF6E',
      },
    },
    ember: {
      name: 'Ember Keep',
      colors: {
        parchment: '#F3DEC7', 'parchment-dark': '#E7C6A3', gold: '#E8912F', 'gold-dark': '#C36F1C',
        green: '#7A8C3A', blue: '#4A7FA5', red: '#C7362B', orange: '#E0611E',
        ink: '#3B2318', 'card-bg': '#FBEFE2', 'card-border': '#D19A6A',
      },
    },
    royal: {
      name: 'Royal Twilight',
      colors: {
        parchment: '#E4E1F0', 'parchment-dark': '#D3CEE8', gold: '#D8B24C', 'gold-dark': '#B4903A',
        green: '#3E7A5E', blue: '#3E5FA8', red: '#A6416E', orange: '#C97B4A',
        ink: '#2A2340', 'card-bg': '#F1EEF9', 'card-border': '#9C8FC9',
      },
    },
    rose: {
      name: 'Rose Dusk',
      colors: {
        parchment: '#F5E1E8', 'parchment-dark': '#EAC9D6', gold: '#E0A052', 'gold-dark': '#BD7E33',
        green: '#5C8C6E', blue: '#6E86C4', red: '#C2456E', orange: '#D97E52',
        ink: '#402A38', 'card-bg': '#FBEEF3', 'card-border': '#CC9BB3',
      },
    },
  };

  const PRESET_ORDER = ['parchment', 'forest', 'ember', 'royal', 'rose'];

  function hsl(h, s, l) {
    return `hsl(${Math.round(((h % 360) + 360) % 360)}, ${s}%, ${l}%)`;
  }

  // Derives a full palette from a single hue (0-360) via fixed offsets/roles, so the color
  // wheel only needs to ask the user for one thing and still gets a coherent theme out.
  function paletteFromHue(hue) {
    return {
      parchment: hsl(hue, 42, 89),
      'parchment-dark': hsl(hue, 42, 81),
      gold: hsl(hue + 35, 68, 58),
      'gold-dark': hsl(hue + 35, 68, 44),
      green: hsl(hue + 140, 32, 42),
      blue: hsl(hue + 220, 45, 55),
      red: hsl(hue + 10, 60, 52),
      orange: hsl(hue + 55, 62, 52),
      ink: hsl(hue, 30, 20),
      'card-bg': hsl(hue, 48, 95),
      'card-border': hsl(hue, 38, 66),
    };
  }

  function applyColors(colors) {
    const root = document.documentElement.style;
    VARS.forEach((v) => {
      if (colors[v]) root.setProperty('--' + v, colors[v]);
    });
  }

  function applyActive() {
    const t = WT.storage.getTheme();
    if (t.presetId === 'custom') {
      const custom = (t.customPresets || []).find((c) => c.id === t.activeCustomId);
      if (custom) {
        applyColors(paletteFromHue(custom.hue));
        return;
      }
    }
    const preset = PRESETS[t.presetId] || PRESETS.parchment;
    applyColors(preset.colors);
  }

  function selectPreset(presetId) {
    const t = WT.storage.getTheme();
    t.presetId = presetId;
    WT.storage.setTheme(t);
    applyActive();
  }

  function selectCustom(customId) {
    const t = WT.storage.getTheme();
    t.presetId = 'custom';
    t.activeCustomId = customId;
    WT.storage.setTheme(t);
    applyActive();
  }

  function saveCustomPreset(name, hue) {
    const t = WT.storage.getTheme();
    const id = 'c_' + Date.now();
    t.customPresets = t.customPresets || [];
    t.customPresets.push({ id, name: name || 'Custom', hue });
    t.presetId = 'custom';
    t.activeCustomId = id;
    WT.storage.setTheme(t);
    applyActive();
    return id;
  }

  function deleteCustomPreset(id) {
    const t = WT.storage.getTheme();
    t.customPresets = (t.customPresets || []).filter((c) => c.id !== id);
    if (t.activeCustomId === id) {
      t.presetId = 'parchment';
      t.activeCustomId = null;
    }
    WT.storage.setTheme(t);
    applyActive();
  }

  return {
    PRESETS,
    PRESET_ORDER,
    paletteFromHue,
    applyColors,
    applyActive,
    selectPreset,
    selectCustom,
    saveCustomPreset,
    deleteCustomPreset,
  };
})();
