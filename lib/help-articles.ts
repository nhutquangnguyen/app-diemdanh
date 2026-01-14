export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  category: 'getting-started' | 'features' | 'advanced' | 'faq';
  icon: string;
  readTime: number; // in minutes
  popular?: boolean;
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'bat-dau',
    title: 'Bắt Đầu Sử Dụng',
    description: 'Hướng dẫn từng bước để thiết lập cửa hàng, thêm nhân viên và bắt đầu điểm danh',
    category: 'getting-started',
    icon: '🚀',
    readTime: 5,
    popular: true,
  },
  {
    slug: 'diem-danh',
    title: 'Hướng Dẫn Điểm Danh',
    description: 'Các cách điểm danh vào/ra, xử lý tình huống và mẹo sử dụng hiệu quả',
    category: 'features',
    icon: '✓',
    readTime: 3,
    popular: true,
  },
  {
    slug: 'xep-lich-ai',
    title: 'Sử Dụng Xếp Lịch AI',
    description: 'Tự động xếp lịch thông minh với AI - tiết kiệm thời gian và công bằng',
    category: 'features',
    icon: '⚡',
    readTime: 4,
    popular: true,
  },
  {
    slug: 'cai-dat-app',
    title: 'Cài Đặt Ứng Dụng PWA',
    description: 'Hướng dẫn cài đặt DiemDanh như app trên điện thoại và máy tính',
    category: 'getting-started',
    icon: '📱',
    readTime: 2,
  },
];

export const categories = {
  'getting-started': {
    name: 'Bắt Đầu',
    description: 'Hướng dẫn cơ bản để bắt đầu sử dụng DiemDanh',
    icon: '🎯',
  },
  'features': {
    name: 'Tính Năng',
    description: 'Hướng dẫn sử dụng các tính năng chính',
    icon: '✨',
  },
  'advanced': {
    name: 'Nâng Cao',
    description: 'Các tính năng và cài đặt nâng cao',
    icon: '⚙️',
  },
  'faq': {
    name: 'Câu Hỏi Thường Gặp',
    description: 'Câu trả lời cho các câu hỏi phổ biến',
    icon: '❓',
  },
};

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return helpArticles.find(article => article.slug === slug);
}

export function getArticlesByCategory(category: string): HelpArticle[] {
  return helpArticles.filter(article => article.category === category);
}

export function getPopularArticles(): HelpArticle[] {
  return helpArticles.filter(article => article.popular);
}
