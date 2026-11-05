/**
 * Hand-curated release notes, newest version first.
 *
 * Curation policy — only significant, user-facing updates are recorded:
 * new features, and major changes/optimizations users will clearly notice.
 * Tiny changes (small style tweaks, minor fixes) are intentionally omitted.
 * Keep each bullet short; adjacent minor releases are merged into their
 * newest version's entry. The newest entry's version must always equal the
 * current app version — a release with nothing significant to record merges
 * into the top entry and bumps its version label.
 *
 * Older history is consolidated: releases from the same era are folded into
 * one entry labeled with that era's newest version, holding a few summary
 * bullets instead of per-release detail. Fold entries upward the same way
 * whenever this list grows unwieldy again.
 *
 * The release skill appends a new entry at the top of `CHANGELOG` for each
 * release that carries significant changes (and skips trivial ones).
 *
 * `date` is the release date in ISO `YYYY-MM-DD`. `notes` carries per-language
 * bullet points; pick the list for the active language at render time.
 */

export interface ChangelogEntryNotes {
  zh: string[];
  en: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: ChangelogEntryNotes;
}

export const CHANGELOG: ChangelogEntry[] = [
    {
      version: "1.1.28",
      date: "2026-11-05",
      notes: {
        zh: ["优化：动态头像 GIF 的透明背景和动画效果", "优化：柔化动态头像消息气泡阴影"],
        en: ["Improved: transparent backgrounds and animations for companion GIFs", "Improved: softer companion message bubble shadows"],
      },
    },
    {
      version: "1.1.27",
      date: "2026-11-05",
      notes: {
        zh: ["优化：工作台默认列宽与窗口缩放时的布局", "优化：标题编辑和图片预览中帮助、版本记录弹窗的层级"],
        en: ["Improved: default workbench column widths and layout on resize", "Improved: title editing and help and version history dialog layering over image previews"],
      },
    },
    {
      version: "1.1.26",
      date: "2026-11-04",
      notes: {
        zh: ["优化：图片预览按显示像素调整清晰度和宽度，并避让工具栏"],
        en: ["Improved: image preview clarity and width match display pixels while avoiding the toolbar"],
      },
    },
    {
      version: "1.1.25",
      date: "2026-11-03",
      notes: {
        zh: ["修复：可从提醒列表折叠按钮拖动列表，同时保留点击折叠", "调整：常用应用预设更新为 VSCode-huawei 并移除 Outlook 邮件"],
        en: ["Fixed: drag reminder lists from the collapse button while preserving click-to-collapse", "Changed: updated the VSCode-huawei app preset and removed Outlook Mail"],
      },
    },
    {
      version: "1.1.24",
      date: "2026-11-02",
      notes: {
        zh: ["优化：快捷动作拖拽落点更贴近指针", "修复：提醒事项跨列表拖拽闪烁及空列表落点对齐"],
        en: ["Improved: quick action drop slots stay closer to the pointer", "Fixed: reminder flicker during cross-list drag and drop-slot alignment in empty lists"],
      },
    },
    {
      version: "1.1.23",
      date: "2026-11-02",
      notes: {
        zh: [
          "优化：拖拽排序跨分组移动时分组高度平滑过渡",
          "修复：快捷按钮旁的空白处可作为拖拽落位点",
        ],
        en: [
          "Improved: group heights animate smoothly while drag sorting across groups",
          "Fixed: blank space beside a quick button now works as a drop target",
        ],
      },
    },
    {
      version: "1.1.22",
      date: "2026-11-01",
      notes: {
        zh: ["优化：工作台区域显示和隐藏时的过渡动画", "优化：快捷动作右键菜单支持在所在列表新建和粘贴"],
        en: ["Improved: transitions when showing or hiding workbench zones", "Improved: create and paste into the current list from a quick action menu"],
      },
    },
    {
      version: "1.1.21",
      date: "2026-11-01",
      notes: {
        zh: [
          "优化：调整图片预览工具栏的布局、分组和亮色样式",
          "优化：列表菜单新增创建操作，调整创建与粘贴按钮顺序",
          "修复：记事本标签重命名时的文字裁切、滚动和光标显示",
          "优化：反馈 Issue 自动填入模板内容",
        ],
        en: [
          "Improved: image preview toolbar layout, grouping, and light theme styling",
          "Improved: added create actions to list menus and reordered create and paste buttons",
          "Fixed: notebook tab rename text clipping, scrolling, and caret display",
          "Improved: feedback issues are prefilled with the template",
        ],
      },
    },
    {
      version: "1.1.14",
      date: "2026-10-27",
      notes: {
        zh: [
          "优化：大幅降低大看板拖拽排序与分组折叠的布局开销，操作更流畅",
        ],
        en: [
          "Improved: far less layout work while drag sorting or collapsing groups on large boards, for smoother interactions",
        ],
      },
    },
    {
      version: "1.1.12",
      date: "2026-10-23",
      notes: {
        zh: [
          "新增：拖拽排序实时预览落位空隙，支持拖入折叠分组",
          "优化：提醒列表拖拽排序与落位动画更顺滑稳定",
          "修复：隐藏的快捷按钮按当前标签筛选显示",
        ],
        en: [
          "New: live landing-gap preview while drag sorting; drops onto collapsed groups",
          "Improved: smoother, steadier reminder drag sorting and landing animations",
          "Fixed: hidden quick actions now filtered by the selected tag",
        ],
      },
    },
    {
      version: "1.1.10",
      date: "2026-10-22",
      notes: {
        zh: [
          "新增：一键清理所有列表的已完成提醒",
          "新增：快捷按钮右键按类型复制",
        ],
        en: [
          "New: clear completed reminders across all lists in one click",
          "New: per-type copy on quick button right-click",
        ],
      },
    },
    {
      version: "1.1.8",
      date: "2026-10-15",
      notes: {
        zh: [
          "新增：顶栏一键切换浅色 / 深色 / 跟随系统",
          "新增：提醒拖入快捷区或记事本，快捷按钮显示点击次数",
          "调整：名称限长 20 字；石墨灰 + 钢青蓝配色与动画细节打磨",
        ],
        en: [
          "New: one-button light / dark / system theme cycling in the top bar",
          "New: drag reminders into the quick area or notebook; quick buttons show click counts",
          "Changed: 20-character name cap; graphite-blue palette and animation polish",
        ],
      },
    },
    {
      version: "1.0.209",
      date: "2026-10-11",
      notes: {
        zh: [
          "新增：「现在做这个」专注模式（计时 + 记事 + 贴图）",
          "新增：提醒多列布局，智能粘贴识别时间生成闹钟，记事本富文本标注",
          "改版：桌面与手机视觉焕新，四区宽度引入黄金分割",
        ],
        en: [
          "New: \"Do it now\" focus mode with timer, notes, and images",
          "New: multi-column reminders, time-aware smart paste, rich-text notes",
          "Redesign: refreshed desktop and mobile visuals with golden-ratio zones",
        ],
      },
    },
    {
      version: "1.0.156",
      date: "2026-08-29",
      notes: {
        zh: [
          "新增：手机速记，扫码配对自动同步到电脑",
          "新增：多工作空间、全局搜索与快捷动作分组",
          "优化：自建中继不限量，可离线使用与安装",
        ],
        en: [
          "New: mobile quick capture synced to the desktop via QR pairing",
          "New: multi-workspace, global search, grouped quick actions",
          "Improved: self-hosted relay, offline support, installable app",
        ],
      },
    },
    {
      version: "1.0.45",
      date: "2026-06-06",
      notes: {
        zh: [
          "首个正式版：四区看板、截止时间与到期通知",
          "随后补齐：多标签页保护、贴图、自定义列表与陪伴 GIF",
        ],
        en: [
          "First release: four-zone board with deadlines and notifications",
          "Then: multi-tab safety, images, custom lists, companion GIFs",
        ],
      },
    },
];
