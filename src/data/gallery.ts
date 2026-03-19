export type BuildingType = 'residential' | 'public' | 'commercial' | 'landscape' | 'interior';
export type RenderStyle = 'photorealistic' | 'watercolor' | 'massing' | 'conceptual' | 'linework';

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  buildingType: BuildingType;
  style: RenderStyle;
}

export const BUILDING_TYPES: { id: BuildingType; name: string; en: string }[] = [
  { id: 'residential', name: '住宅', en: 'RESIDENTIAL' },
  { id: 'public',      name: '公建', en: 'PUBLIC'      },
  { id: 'commercial',  name: '商业', en: 'COMMERCIAL'  },
  { id: 'landscape',   name: '景观', en: 'LANDSCAPE'   },
  { id: 'interior',    name: '室内', en: 'INTERIOR'    },
];

// Placeholder gallery images — replace with curated architecture renderings in /public/gallery/
// All images sourced from Unsplash (architecture category)
export const GALLERY_IMAGES: GalleryImage[] = [
  // ── Residential ───────────────────────────────────────
  { id: 'r-p-1', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80', alt: '现代住宅写实',    buildingType: 'residential', style: 'photorealistic' },
  { id: 'r-p-2', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80', alt: '住宅外观',        buildingType: 'residential', style: 'photorealistic' },
  { id: 'r-p-3', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80', alt: '独栋别墅',        buildingType: 'residential', style: 'photorealistic' },
  { id: 'r-p-4', url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80', alt: '现代住宅日景',    buildingType: 'residential', style: 'photorealistic' },
  { id: 'r-w-1', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', alt: '住宅概念图',      buildingType: 'residential', style: 'watercolor'     },
  { id: 'r-m-1', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80', alt: '住宅体块分析',    buildingType: 'residential', style: 'massing'        },
  { id: 'r-c-1', url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&q=80', alt: '住宅概念设计',    buildingType: 'residential', style: 'conceptual'     },

  // ── Public ────────────────────────────────────────────
  { id: 'p-p-1', url: 'https://images.unsplash.com/photo-1460574283810-2aab119d8511?w=400&q=80', alt: '公共建筑写实',    buildingType: 'public', style: 'photorealistic' },
  { id: 'p-p-2', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&q=80', alt: '文化建筑',        buildingType: 'public', style: 'photorealistic' },
  { id: 'p-p-3', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80', alt: '公建幕墙',        buildingType: 'public', style: 'photorealistic' },
  { id: 'p-p-4', url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80', alt: '公建室外广场',    buildingType: 'public', style: 'photorealistic' },
  { id: 'p-m-1', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', alt: '公建体块',        buildingType: 'public', style: 'massing'        },
  { id: 'p-w-1', url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=80', alt: '公建水彩表现',    buildingType: 'public', style: 'watercolor'     },

  // ── Commercial ────────────────────────────────────────
  { id: 'c-p-1', url: 'https://images.unsplash.com/photo-1481026469463-66327c86e544?w=400&q=80', alt: '商业综合体',      buildingType: 'commercial', style: 'photorealistic' },
  { id: 'c-p-2', url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=400&q=80', alt: '商业立面',        buildingType: 'commercial', style: 'photorealistic' },
  { id: 'c-p-3', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80', alt: '商业办公楼',      buildingType: 'commercial', style: 'photorealistic' },
  { id: 'c-m-1', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80', alt: '商业体块',        buildingType: 'commercial', style: 'massing'        },

  // ── Landscape ─────────────────────────────────────────
  { id: 'l-p-1', url: 'https://images.unsplash.com/photo-1519817914152-22d216bb9170?w=400&q=80', alt: '户外景观',        buildingType: 'landscape', style: 'photorealistic' },
  { id: 'l-p-2', url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80', alt: '景观花园',        buildingType: 'landscape', style: 'photorealistic' },
  { id: 'l-w-1', url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80', alt: '景观概念图',      buildingType: 'landscape', style: 'watercolor'     },
  { id: 'l-c-1', url: 'https://images.unsplash.com/photo-1444492156724-6383118f4213?w=400&q=80', alt: '景观规划',        buildingType: 'landscape', style: 'conceptual'     },

  // ── Interior ──────────────────────────────────────────
  { id: 'i-p-1', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80', alt: '现代室内',        buildingType: 'interior', style: 'photorealistic' },
  { id: 'i-p-2', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', alt: '起居空间',        buildingType: 'interior', style: 'photorealistic' },
  { id: 'i-p-3', url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80', alt: '开放式厨房',      buildingType: 'interior', style: 'photorealistic' },
  { id: 'i-p-4', url: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&q=80', alt: '极简室内',        buildingType: 'interior', style: 'photorealistic' },
];
