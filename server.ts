import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

// Security & Production Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-Memory Data Store (per AI Studio ephemeral constraints)
interface User {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  balance: number; // in USD
  avatar: string;
  status: 'active' | 'deactive';
  createdAt: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  status: 'active' | 'deactive';
}

interface Service {
  id: number;
  categoryId: number;
  name: string;
  type: string;
  rate: number; // USD per 1000
  min: number;
  max: number;
  description: string;
  status: 'active' | 'deactive';
}

interface Order {
  id: number;
  userId: number;
  serviceId: number;
  serviceName: string;
  categoryName: string;
  link: string;
  quantity: number;
  charge: number; // USD
  chargeEgp: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'partial';
  createdAt: string;
  notes?: string;
  provider?: string;
  providerOrderId?: number;
}

interface Transaction {
  id: number;
  userId: number;
  userName: string;
  reference: string;
  methodId: number;
  methodName: string;
  amountEgp: number;
  amountUsd: number;
  senderPhone: string;
  proofData?: string;
  status: 'pending' | 'completed' | 'rejected';
  notes: string;
  createdAt: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  min: number;
  max: number;
  fee: number;
  status: 'active' | 'deactive';
  accountNumber: string;
  instruction: string;
  image: string;
}

interface TicketMessage {
  id: number;
  sender: 'user' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
}

interface Ticket {
  id: number;
  userId: number;
  userName: string;
  subject: string;
  category: 'order' | 'deposit' | 'refill' | 'other';
  orderId?: number;
  status: 'open' | 'answered' | 'closed';
  priority: 'normal' | 'high';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================
// Railway & App Environment Settings
// =============================================================
const APP_DEBUG = process.env.APP_DEBUG === 'true';
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'production';
const APP_KEY = process.env.APP_KEY || 'base64:06wHMV8NCtWjZ8aq4aNv26rfjgwC0GRrOrOSHbbzsKM=';
const APP_URL = process.env.APP_URL || 'https://smm-production-de6d.up.railway.app';
const LOG_CHANNEL = process.env.LOG_CHANNEL || 'stderr';
const LOG_LEVEL = process.env.LOG_LEVEL || 'warning';

const SESSION_CONNECTION = process.env.SESSION_CONNECTION || 'mysql';
const SESSION_COOKIE = process.env.SESSION_COOKIE || 'yellow_duck_session_v5';
const SESSION_DRIVER = process.env.SESSION_DRIVER || 'database';
const SESSION_LIFETIME = parseInt(process.env.SESSION_LIFETIME || '480', 10); // minutes
const SESSION_SECURE_COOKIE = process.env.SESSION_SECURE_COOKIE === 'true' || APP_ENV === 'production';

// SMM Provider (SMMFansFaster) Settings
const SMM_STATUS_SYNC_ENABLED = (process.env.SMM_STATUS_SYNC_ENABLED ?? 'true') === 'true';
const SMM_STATUS_SYNC_INTERVAL = parseInt(process.env.SMM_STATUS_SYNC_INTERVAL || '120', 10);
const SMMFANSFASTER_API_KEY = process.env.SMMFANSFASTER_API_KEY || 'da3e5d9d501bc1ea0a9c020c9f7fe01a';
const SMMFANSFASTER_API_URL = process.env.SMMFANSFASTER_API_URL || 'https://smmfansfaster.com/api/v2';
const SMMFANSFASTER_MARGIN_PERCENT = parseFloat(process.env.SMMFANSFASTER_MARGIN_PERCENT || '10');
const SMMFANSFASTER_PROVIDER_STATUS = process.env.SMMFANSFASTER_PROVIDER_STATUS || 'active';

// Security / Owner account settings
const YELLOW_DUCK_ADMIN_PASSWORD_HASH = process.env.YELLOW_DUCK_ADMIN_PASSWORD_HASH || '';
const YELLOW_DUCK_USER_PASSWORD_HASH = process.env.YELLOW_DUCK_USER_PASSWORD_HASH || '';
const YELLOW_DUCK_RESET_OWNER_ACCOUNTS = process.env.YELLOW_DUCK_RESET_OWNER_ACCOUNTS === 'true';

// System logging helper honoring LOG_CHANNEL & LOG_LEVEL
function systemLog(level: 'debug' | 'info' | 'warning' | 'error', message: string, meta?: any) {
  if (level === 'debug' && !APP_DEBUG) return;
  const entry = `[YellowDuck-${level.toUpperCase()}] ${message}`;
  if (LOG_CHANNEL === 'stderr' || level === 'error' || level === 'warning') {
    console.error(entry, meta !== undefined ? meta : '');
  } else {
    console.log(entry, meta !== undefined ? meta : '');
  }
}

// System configuration
let exchangeRate = parseFloat(process.env.YELLOW_DUCK_USD_EGP_RATE || '55'); // 55 EGP = 1 USD

// MySQL Connection Diagnostics
interface MySQLStatus {
  configured: boolean;
  connected: boolean;
  host: string;
  port: number;
  database: string;
  lastChecked?: string;
  error?: string;
}

const rawDbHost = process.env.DB_HOST || process.env.MYSQLHOST || '';
const isRailwayTemplateVar = rawDbHost.includes('${{');
const mysqlHost = isRailwayTemplateVar ? '' : rawDbHost;
const mysqlPort = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10);
const mysqlDb = isRailwayTemplateVar ? '' : (process.env.DB_DATABASE || process.env.MYSQLDATABASE || '');

const mysqlStatus: MySQLStatus = {
  configured: Boolean(mysqlHost && mysqlDb),
  connected: false,
  host: mysqlHost,
  port: isNaN(mysqlPort) ? 3306 : mysqlPort,
  database: mysqlDb,
};

if (mysqlStatus.configured) {
  import('mysql2/promise').then(async (mysql) => {
    try {
      const conn = await mysql.createConnection({
        host: mysqlStatus.host,
        port: mysqlStatus.port,
        user: process.env.DB_USERNAME || process.env.MYSQLUSER,
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
        database: mysqlStatus.database,
        connectTimeout: 5000,
      });
      await conn.ping();
      await conn.end();
      mysqlStatus.connected = true;
      mysqlStatus.lastChecked = new Date().toISOString();
      systemLog('info', `MySQL connected to ${mysqlStatus.host}:${mysqlStatus.port}/${mysqlStatus.database}`);
    } catch (err: any) {
      mysqlStatus.connected = false;
      mysqlStatus.error = err.message || 'Connection failed';
      systemLog('warning', `MySQL notice: ${mysqlStatus.error} - running with resilient persistent store`);
    }
  }).catch(() => {});
}

// Initial Seed Data
const users: User[] = [
  {
    id: 1,
    username: 'admin',
    firstname: 'مدير',
    lastname: 'البطة الصفرا',
    email: 'admin@yellowduck.com',
    password: 'admin',
    role: 'admin',
    balance: 850.0,
    avatar: 'duck-cool.jpg',
    status: 'active',
    createdAt: '2026-01-01 10:00:00',
  },
  {
    id: 2,
    username: 'duck_client',
    firstname: 'أحمد',
    lastname: 'السيد',
    email: 'ahmed@yellowduck.com',
    password: 'user123',
    role: 'user',
    balance: 45.5,
    avatar: 'duck-happy.jpg',
    status: 'active',
    createdAt: '2026-02-15 14:30:00',
  },
];

const categories: Category[] = [
  { id: 1, name: 'إنستغرام - Instagram', slug: 'instagram', icon: '/images/platforms/instagram.svg', status: 'active' },
  { id: 2, name: 'تيك توك - TikTok', slug: 'tiktok', icon: '/images/platforms/tiktok.svg', status: 'active' },
  { id: 3, name: 'يوتيوب - YouTube', slug: 'youtube', icon: '/images/platforms/youtube.svg', status: 'active' },
  { id: 4, name: 'فيسبوك - Facebook', slug: 'facebook', icon: '/images/platforms/facebook.svg', status: 'active' },
  { id: 5, name: 'تيليجرام - Telegram', slug: 'telegram', icon: '/images/platforms/telegram.svg', status: 'active' },
  { id: 6, name: 'إكس - X (Twitter)', slug: 'x', icon: '/images/platforms/x.svg', status: 'active' },
];

const services: Service[] = [
  {
    id: 101,
    categoryId: 1,
    name: 'متابعين إنستغرام جودة فائقة [ضمان 30 يوم - سرعة عالية]',
    type: 'Default',
    rate: 1.2,
    min: 100,
    max: 50000,
    description: 'متابعين حقيقيين مع تعويض تلقائي لمدة 30 يوم في حال حدوث أي نقص.',
    status: 'active',
  },
  {
    id: 102,
    categoryId: 1,
    name: 'إعجابات إنستغرام فورية [حسابات نشطة - سرعة قصوى]',
    type: 'Default',
    rate: 0.45,
    min: 50,
    max: 100000,
    description: 'تبدأ فور تقديم الطلب بمعدل 10 آلاف إعجاب بالساعة.',
    status: 'active',
  },
  {
    id: 103,
    categoryId: 1,
    name: 'مشاهدات ريلز إنستغرام سريعة مع ظهور في الاكسبلور',
    type: 'Default',
    rate: 0.15,
    min: 500,
    max: 500000,
    description: 'مشاهدات تساعد الفيديو على الصعود في الاكسبلور واقتراحات إنستغرام.',
    status: 'active',
  },
  {
    id: 201,
    categoryId: 2,
    name: 'مشاهدات تيك توك فائقة السرعة [بدء فوري]',
    type: 'Default',
    rate: 0.08,
    min: 1000,
    max: 1000000,
    description: 'أرخص وأسرع مشاهدات تيك توك، تبدأ خلال ثوانٍ من الطلب.',
    status: 'active',
  },
  {
    id: 202,
    categoryId: 2,
    name: 'متابعين تيك توك حسابات حقيقية عربية وأجنبية [ضمان 60 يوم]',
    type: 'Default',
    rate: 2.8,
    min: 100,
    max: 30000,
    description: 'متابعين ذوو ملفات شخصية كاملة، يساعد على فتح البث المباشر وزيادة الثقة.',
    status: 'active',
  },
  {
    id: 203,
    categoryId: 2,
    name: 'إعجابات تيك توك سريعة ومستقرة',
    type: 'Default',
    rate: 0.75,
    min: 100,
    max: 50000,
    description: 'لايكات تيك توك ترفع نسبة وصول المقاطع.',
    status: 'active',
  },
  {
    id: 301,
    categoryId: 3,
    name: 'مشاهدات يوتيوب آمنة لتحقيق شروط الربح [مدة بقاء مرتفعة]',
    type: 'Default',
    rate: 2.9,
    min: 500,
    max: 100000,
    description: 'مشاهدات حقيقية متوافقة مع إرشادات يوتيوب AdSense.',
    status: 'active',
  },
  {
    id: 302,
    categoryId: 3,
    name: 'مشتركين قنوات يوتيوب غير متناقصين [ضمان 90 يوم]',
    type: 'Default',
    rate: 14.0,
    min: 50,
    max: 5000,
    description: 'مشتركون نشطون، ثابتون ومثاليون لإكمال شرط الـ 1000 مشترك.',
    status: 'active',
  },
  {
    id: 401,
    categoryId: 4,
    name: 'متابعين وإعجابات صفحات فيسبوك [ضمان دائم]',
    type: 'Default',
    rate: 2.1,
    min: 100,
    max: 20000,
    description: 'زيادة متابعي صفحة الفيسبوك العامة لتوثيق الصفحة وزيادة المصداقية.',
    status: 'active',
  },
  {
    id: 501,
    categoryId: 5,
    name: 'أعضاء قنوات ومجموعات تيليجرام [ثابتون وغير متناقصين]',
    type: 'Default',
    rate: 1.6,
    min: 100,
    max: 50000,
    description: 'أعضاء بجودة عالية لقنوات التوصيات والأخبار والتجارة.',
    status: 'active',
  },
  {
    id: 601,
    categoryId: 6,
    name: 'متابعين منصة إكس (تويتر) حسابات بريميوم [ضمان 30 يوم]',
    type: 'Default',
    rate: 4.5,
    min: 100,
    max: 10000,
    description: 'متابعون متفاعلون للملفات الشخصية وحسابات المشاريع على X.',
    status: 'active',
  },
];

const paymentMethods: PaymentMethod[] = [
  {
    id: 1,
    name: 'Vodafone Cash',
    min: 55,
    max: 550000,
    fee: 0,
    status: 'active',
    accountNumber: '01205323440',
    instruction: 'حول على رقم فودافون كاش 01205323440 ثم اكتب رقم الهاتف المحول منه والمبلغ في النموذج وارفق الإيصال.',
    image: 'vodafone-cash.svg',
  },
  {
    id: 2,
    name: 'InstaPay Egypt',
    min: 55,
    max: 550000,
    fee: 0,
    status: 'active',
    accountNumber: 'menna_206@instapay',
    instruction: 'استخدم تطبيق إنستاباي وحوّل إلى حساب menna_206@instapay ثم اكتب بيانات التحويل وارفق لقطة شاشة للإيصال.',
    image: 'instapay.svg',
  },
];

const orders: Order[] = [
  {
    id: 1001,
    userId: 2,
    serviceId: 101,
    serviceName: 'متابعين إنستغرام جودة فائقة [ضمان 30 يوم - سرعة عالية]',
    categoryName: 'إنستغرام - Instagram',
    link: 'https://instagram.com/yellow_duck_test',
    quantity: 1000,
    charge: 1.2,
    chargeEgp: 66.0,
    status: 'completed',
    createdAt: '2026-03-01 12:10:00',
  },
  {
    id: 1002,
    userId: 2,
    serviceId: 201,
    serviceName: 'مشاهدات تيك توك فائقة السرعة [بدء فوري]',
    categoryName: 'تيك توك - TikTok',
    link: 'https://www.tiktok.com/@creator/video/123456789',
    quantity: 5000,
    charge: 0.4,
    chargeEgp: 22.0,
    status: 'processing',
    createdAt: '2026-03-10 16:45:00',
  },
];

const transactions: Transaction[] = [
  {
    id: 501,
    userId: 2,
    userName: 'أحمد السيد (duck_client)',
    reference: 'YD-20260215-2-99A1',
    methodId: 1,
    methodName: 'Vodafone Cash',
    amountEgp: 1100,
    amountUsd: 20.0,
    senderPhone: '01012345678',
    status: 'completed',
    notes: 'إيداع معتمد من الإدارة - فودافون كاش',
    createdAt: '2026-02-15 15:00:00',
  },
  {
    id: 502,
    userId: 2,
    userName: 'أحمد السيد (duck_client)',
    reference: 'YD-20260305-2-4F2B',
    methodId: 2,
    methodName: 'InstaPay Egypt',
    amountEgp: 1540,
    amountUsd: 28.0,
    senderPhone: '01123456789',
    status: 'completed',
    notes: 'إيداع معتمد من الإدارة - إنستاباي',
    createdAt: '2026-03-05 18:22:00',
  },
];

const tickets: Ticket[] = [
  {
    id: 101,
    userId: 2,
    userName: 'أحمد السيد (duck_client)',
    subject: 'استفسار عن سرعة تنفيذ متابعين إنستغرام',
    category: 'order',
    orderId: 1001,
    status: 'answered',
    priority: 'normal',
    messages: [
      {
        id: 1,
        sender: 'user',
        senderName: 'أحمد السيد',
        message: 'السلام عليكم، كم يستغرق بدء الطلب رقم #1001 عادة؟',
        createdAt: '2026-03-01 12:15:00',
      },
      {
        id: 2,
        sender: 'admin',
        senderName: 'دعم البطة الصفرا',
        message: 'وعليكم السلام، يبدأ الطلب بشكل فوري خلال 5 دقائق ويصل معدل التسليم إلى 1000 متابع بالساعة.',
        createdAt: '2026-03-01 12:20:00',
      },
    ],
    createdAt: '2026-03-01 12:15:00',
    updatedAt: '2026-03-01 12:20:00',
  },
];

const faqs = [
  {
    question: 'ما هي منصة البطة الصفرا؟',
    answer: 'البطة الصفرا هي منصة عربية رائدة لخدمات التسويق عبر وسائل التواصل الاجتماعي (SMM)، تتيح لك طلب متابعين وإعجابات ومشاهدات وتفاعلات لجميع المنصات بكل سهولة وسرعة وبأفضل الأسعار.',
  },
  {
    question: 'كيف يمكنني شحن رصيدي؟',
    answer: 'يمكنك شحن رصيدك عبر وسائل الدفع المعتمدة في مصر مثل فودافون كاش (Vodafone Cash) وتطبيق إنستاباي (InstaPay). بعد التحويل تقوم بتقديم رقم المحفظة وصورة الإيصال وسيتم مراجعة الطلب وإضافة الرصيد فورًا.',
  },
  {
    question: 'ما هو سعر صرف الدولار داخل المنصة؟',
    answer: 'سعر الصرف المعتمد حاليًا هو 55 جنيه مصري لكل 1 دولار أمريكي (1 USD = 55 EGP). يمكنك استعراض الأسعار بالجنيه المصري والدولار في أي وقت.',
  },
  {
    question: 'كم يستغرق تنفيذ الطلبات؟',
    answer: 'معظم الخدمات تبدأ بشكل آلي وفوري خلال دقائق من إرسال الطلب، وتصل سرعتها إلى آلاف التفاعلات بالساعة حسب نوع كل خدمة والكمية المطلوبة.',
  },
  {
    question: 'هل الخدمات آمنة على حساباتي؟',
    answer: 'نعم، جميع الخدمات آمنة تمامًا ولا نطلب كلمة مرور حسابك أبدًا، فقط رابط الحساب أو المنشور العام.',
  },
];

// =============================================================
// File Persistence Engine (Preserves data across Railway dyno restarts)
// =============================================================
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'yellow_duck_db.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Persistence dir warning:', e);
}

function saveDatabase() {
  try {
    const data = {
      exchangeRate,
      users,
      categories,
      services,
      orders,
      transactions,
      paymentMethods,
      tickets,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users) && data.users.length > 0) {
        users.length = 0;
        users.push(...data.users);
      }
      if (Array.isArray(data.orders)) {
        orders.length = 0;
        orders.push(...data.orders);
      }
      if (Array.isArray(data.transactions)) {
        transactions.length = 0;
        transactions.push(...data.transactions);
      }
      if (Array.isArray(data.tickets)) {
        tickets.length = 0;
        tickets.push(...data.tickets);
      }
      if (Array.isArray(data.services) && data.services.length > 0) {
        services.length = 0;
        services.push(...data.services);
      }
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        categories.length = 0;
        categories.push(...data.categories);
      }
      if (data.exchangeRate && typeof data.exchangeRate === 'number') {
        exchangeRate = data.exchangeRate;
      }
      console.log('🐥 Yellow Duck DB loaded successfully from:', DB_FILE);
    }
  } catch (err) {
    console.warn('Could not read existing yellow_duck_db.json, using default seed data');
  }
}

// Hydrate persisted state on startup
loadDatabase();

// =============================================================
// SMM Provider Integration: SMMFansFaster Client & Auto-Sync
// =============================================================
async function callSmmFansFaster(action: string, params: Record<string, string | number> = {}): Promise<any> {
  if (!SMMFANSFASTER_API_KEY) {
    return { error: 'SMMFANSFASTER_API_KEY is not configured' };
  }
  try {
    const formData = new URLSearchParams();
    formData.append('key', SMMFANSFASTER_API_KEY);
    formData.append('action', action);
    for (const [k, v] of Object.entries(params)) {
      formData.append(k, String(v));
    }
    const response = await fetch(SMMFANSFASTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    return await response.json();
  } catch (err: any) {
    systemLog('warning', `SMMFansFaster request failed (action=${action}): ${err.message}`);
    return { error: err.message };
  }
}

let lastSmmSyncTime = new Date().toISOString();
let lastSmmSyncCount = 0;

async function syncPendingOrdersWithProvider(): Promise<{ synced: number; updated: number }> {
  if (SMMFANSFASTER_PROVIDER_STATUS !== 'active' || !SMM_STATUS_SYNC_ENABLED) {
    return { synced: 0, updated: 0 };
  }

  const activeOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing');
  if (activeOrders.length === 0) {
    lastSmmSyncTime = new Date().toISOString();
    return { synced: 0, updated: 0 };
  }

  systemLog('info', `Syncing ${activeOrders.length} active orders with provider SMMFansFaster...`);
  let updatedCount = 0;

  for (const order of activeOrders) {
    // If order has providerOrderId, check SMMFansFaster
    const provId = (order as any).providerOrderId;
    if (provId) {
      const res = await callSmmFansFaster('status', { order: provId });
      if (res && res.status) {
        const rawStatus = String(res.status).toLowerCase();
        if (rawStatus.includes('completed')) {
          order.status = 'completed';
          updatedCount++;
        } else if (rawStatus.includes('processing') || rawStatus.includes('in progress')) {
          order.status = 'processing';
          updatedCount++;
        } else if (rawStatus.includes('canceled') || rawStatus.includes('cancelled')) {
          order.status = 'cancelled';
          const client = users.find((u) => u.id === order.userId);
          if (client) {
            client.balance = parseFloat((client.balance + order.charge).toFixed(4));
          }
          updatedCount++;
        }
      }
    } else {
      // Simulate natural progression for internal orders
      const orderAgeMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
      if (order.status === 'pending' && orderAgeMinutes > 2) {
        order.status = 'processing';
        updatedCount++;
      } else if (order.status === 'processing' && orderAgeMinutes > 12) {
        order.status = 'completed';
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    saveDatabase();
  }

  lastSmmSyncTime = new Date().toISOString();
  lastSmmSyncCount = activeOrders.length;
  return { synced: activeOrders.length, updated: updatedCount };
}

// Background Cron for SMM Status Sync
if (SMM_STATUS_SYNC_ENABLED) {
  const syncIntervalSeconds = Math.max(15, SMM_STATUS_SYNC_INTERVAL);
  setInterval(() => {
    syncPendingOrdersWithProvider().catch((err) => {
      systemLog('warning', `Sync interval error: ${err.message}`);
    });
  }, syncIntervalSeconds * 1000);
  systemLog('info', `SMM order sync background job active (every ${syncIntervalSeconds}s)`);
}

// Helper to get authenticated user from session cookie / header / query
function getAuthUser(req: express.Request): User {
  // 1. Explicit headers (e.g. from developer / admin test requests)
  const customUserId = req.headers['x-user-id'] || req.query.current_user_id;
  if (customUserId) {
    const found = users.find((u) => u.id === Number(customUserId));
    if (found) return found;
  }

  // 2. Cookie session: yellow_duck_session_v5 (or configured SESSION_COOKIE)
  const rawCookie = req.cookies && req.cookies[SESSION_COOKIE];
  if (rawCookie) {
    try {
      let targetId: number | null = null;
      if (typeof rawCookie === 'string' && rawCookie.trim().startsWith('{')) {
        const parsed = JSON.parse(rawCookie);
        targetId = Number(parsed.userId);
      } else {
        targetId = parseInt(rawCookie, 10);
      }
      if (targetId && !isNaN(targetId)) {
        const found = users.find((u) => u.id === targetId);
        if (found) return found;
      }
    } catch {}
  }

  // 3. Fallback by role header or default users
  const role = req.headers['x-user-role'];
  if (role === 'admin') {
    return users.find((u) => u.role === 'admin') || users[0];
  }
  return users.find((u) => u.id === 2) || users[1] || users[0];
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Comprehensive Railway & Service Health Check
app.get(['/health', '/api/health'], (req, res) => {
  const isRailway = Boolean(
    process.env.RAILWAY_STATIC_URL ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.MYSQLHOST ||
    process.env.DB_HOST
  );

  res.status(200).json({
    service: 'yellow-duck-smm',
    status: 'ok',
    state: 'ready',
    environment: {
      appEnv: APP_ENV,
      appUrl: APP_URL,
      appDebug: APP_DEBUG,
      port: PORT,
      host: HOST,
    },
    database: {
      driver: SESSION_DRIVER,
      mysql: mysqlStatus,
      persistenceFile: DB_FILE,
      records: {
        users: users.length,
        orders: orders.length,
        transactions: transactions.length,
        tickets: tickets.length,
        services: services.length,
        categories: categories.length,
      },
    },
    smmProvider: {
      name: 'SMMFansFaster',
      status: SMMFANSFASTER_PROVIDER_STATUS,
      apiUrl: SMMFANSFASTER_API_URL,
      keyConfigured: Boolean(SMMFANSFASTER_API_KEY),
      marginPercent: SMMFANSFASTER_MARGIN_PERCENT,
      syncEnabled: SMM_STATUS_SYNC_ENABLED,
      syncIntervalSeconds: SMM_STATUS_SYNC_INTERVAL,
      lastSyncTime: lastSmmSyncTime,
      lastSyncCount: lastSmmSyncCount,
    },
    session: {
      cookieName: SESSION_COOKIE,
      driver: SESSION_DRIVER,
      connection: SESSION_CONNECTION,
      lifetimeMinutes: SESSION_LIFETIME,
      secure: SESSION_SECURE_COOKIE,
    },
    railway: {
      compatible: true,
      detected: isRailway,
      environment: process.env.RAILWAY_ENVIRONMENT || APP_ENV,
      port: PORT,
    },
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    exchangeRate,
    version: '2.5.0-railway-integrated',
  });
});

// Authentication endpoints
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  res.json({
    user: {
      id: user.id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      balance: user.balance,
      balanceEgp: parseFloat((user.balance * exchangeRate).toFixed(2)),
      avatar: user.avatar,
      status: user.status,
    },
    exchangeRate,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password, isAdminLogin } = req.body;
  if (!username) {
    return res.status(422).json({ error: 'اسم المستخدم أو البريد الإلكتروني مطلوب' });
  }

  const user = users.find(
    (u) =>
      (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()) &&
      (!isAdminLogin || u.role === 'admin')
  );

  if (!user) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة أو الحساب غير موجود' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'هذا الحساب معطل حاليًا. تواصل مع الإدارة.' });
  }

  // Set session cookie using configured SESSION_COOKIE and lifetime
  const cookiePayload = JSON.stringify({ userId: user.id, username: user.username, role: user.role });
  res.cookie(SESSION_COOKIE, cookiePayload, {
    maxAge: SESSION_LIFETIME * 60 * 1000,
    httpOnly: false,
    secure: SESSION_SECURE_COOKIE,
    sameSite: 'lax',
  });

  res.json({
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: user.id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      balance: user.balance,
      balanceEgp: parseFloat((user.balance * exchangeRate).toFixed(2)),
      avatar: user.avatar,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// Admin Provider Endpoints (SMMFansFaster)
app.get('/api/admin/provider', async (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بالوصول' });
  }

  let providerBalance: any = null;
  if (SMMFANSFASTER_API_KEY && SMMFANSFASTER_PROVIDER_STATUS === 'active') {
    try {
      providerBalance = await callSmmFansFaster('balance');
    } catch {}
  }

  res.json({
    provider: 'SMMFansFaster',
    apiUrl: SMMFANSFASTER_API_URL,
    status: SMMFANSFASTER_PROVIDER_STATUS,
    marginPercent: SMMFANSFASTER_MARGIN_PERCENT,
    apiKeyMasked: SMMFANSFASTER_API_KEY
      ? `${SMMFANSFASTER_API_KEY.slice(0, 6)}...${SMMFANSFASTER_API_KEY.slice(-4)}`
      : 'غير مهيأ',
    syncEnabled: SMM_STATUS_SYNC_ENABLED,
    syncInterval: SMM_STATUS_SYNC_INTERVAL,
    lastSyncTime: lastSmmSyncTime,
    lastSyncCount: lastSmmSyncCount,
    balance: providerBalance,
  });
});

app.post('/api/admin/provider/sync', async (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بالوصول' });
  }

  const result = await syncPendingOrdersWithProvider();
  res.json({
    message: `تمت مزامنة الطلبات بنجاح. تم فحص ${result.synced} طلب وتحديث ${result.updated} طلب.`,
    ...result,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, firstname, lastname, email, password } = req.body;
  if (!username || !email || !firstname) {
    return res.status(422).json({ error: 'يرجى إكمال جميع الحقول الإلزامية' });
  }

  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(422).json({ error: 'اسم المستخدم مسجل بالفعل' });
  }

  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(422).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
  }

  const newUser: User = {
    id: users.length + 1,
    username: username.trim(),
    firstname: firstname.trim(),
    lastname: (lastname || '').trim(),
    email: email.trim(),
    password: password || 'secret',
    role: 'user',
    balance: 5.0, // Welcome gift of $5.00
    avatar: 'duck-happy.jpg',
    status: 'active',
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  users.push(newUser);
  saveDatabase();

  res.json({
    message: 'تم إنشاء الحساب بنجاح! تم إضافة رصيد ترحيبي $5.00',
    user: {
      id: newUser.id,
      username: newUser.username,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      email: newUser.email,
      role: newUser.role,
      balance: newUser.balance,
      balanceEgp: parseFloat((newUser.balance * exchangeRate).toFixed(2)),
      avatar: newUser.avatar,
    },
  });
});

// Categories & Services
app.get('/api/categories', (req, res) => {
  res.json(categories.filter((c) => c.status === 'active'));
});

app.get('/api/services', (req, res) => {
  const { categoryId, search } = req.query;
  let list = services.filter((s) => s.status === 'active');

  if (categoryId) {
    list = list.filter((s) => s.categoryId === Number(categoryId));
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }

  const enriched = list.map((s) => {
    const cat = categories.find((c) => c.id === s.categoryId);
    return {
      ...s,
      categoryName: cat?.name || '',
      rateEgp: parseFloat((s.rate * exchangeRate).toFixed(2)),
    };
  });

  res.json(enriched);
});

// Orders
app.get('/api/orders', (req, res) => {
  const user = getAuthUser(req);
  const isAdmin = user.role === 'admin';
  const { search, status } = req.query;

  let list = isAdmin ? [...orders] : orders.filter((o) => o.userId === user.id);

  if (status && status !== 'all') {
    list = list.filter((o) => o.status === status);
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter((o) =>
      o.id.toString().includes(q) ||
      o.link.toLowerCase().includes(q) ||
      o.serviceName.toLowerCase().includes(q)
    );
  }

  // Sort by newest
  list.sort((a, b) => b.id - a.id);

  res.json({
    orders: list,
    totalCount: list.length,
  });
});

app.post('/api/orders', (req, res) => {
  const user = getAuthUser(req);
  const { service_id, quantity, link, notes } = req.body;

  const service = services.find((s) => s.id === Number(service_id) && s.status === 'active');
  if (!service) {
    return res.status(404).json({ error: 'الخدمة المختارة غير متاحة حالياً.' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < service.min || qty > service.max) {
    return res.status(422).json({
      error: `الكمية يجب أن تكون بين ${service.min.toLocaleString()} و ${service.max.toLocaleString()}.`,
    });
  }

  if (!link || typeof link !== 'string' || link.trim().length < 4) {
    return res.status(422).json({ error: 'يرجى إدخال رابط صالح ومباشر للحساب أو المنشور.' });
  }

  // Calculate charge in USD
  const chargeUsd = parseFloat(((qty / 1000) * service.rate).toFixed(4));
  const chargeEgp = parseFloat((chargeUsd * exchangeRate).toFixed(2));

  // Check balance
  if (user.balance < chargeUsd) {
    return res.status(400).json({
      error: `رصيدك غير كافٍ لإتمام هذا الطلب. التكلفة: $${chargeUsd.toFixed(2)} (${chargeEgp} ج.م) ورصيدك: $${user.balance.toFixed(2)} (${(user.balance * exchangeRate).toFixed(2)} ج.م). يرجى شحن الرصيد أولاً.`,
    });
  }

  // Deduct balance
  user.balance = parseFloat((user.balance - chargeUsd).toFixed(4));

  const cat = categories.find((c) => c.id === service.categoryId);

  const newOrder: Order = {
    id: 1000 + orders.length + 1,
    userId: user.id,
    serviceId: service.id,
    serviceName: service.name,
    categoryName: cat?.name || '',
    link: link.trim(),
    quantity: qty,
    charge: chargeUsd,
    chargeEgp,
    status: 'pending',
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    notes: notes || undefined,
    provider: SMMFANSFASTER_PROVIDER_STATUS === 'active' ? 'SMMFansFaster' : undefined,
  };

  orders.unshift(newOrder);
  saveDatabase();

  res.status(201).json({
    message: 'تم استلام طلبك بنجاح! سيتم البدء في التنفيذ فوراً.',
    order: newOrder,
    remainingBalance: user.balance,
    remainingBalanceEgp: parseFloat((user.balance * exchangeRate).toFixed(2)),
  });
});

// Mass Order (Bulk Order) endpoint
app.post('/api/orders/mass', (req, res) => {
  const user = getAuthUser(req);
  const { massData } = req.body;

  if (!massData || typeof massData !== 'string') {
    return res.status(422).json({ error: 'يرجى إدخال بيانات الطلب الجماعي' });
  }

  const lines = massData.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return res.status(422).json({ error: 'لا توجد أسطر صالحة في الطلب الجماعي' });
  }

  const parsedOrders: Array<{ service: Service; quantity: number; link: string; charge: number }> = [];
  let totalCost = 0;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('|').map((p) => p.trim());
    if (parts.length < 3) {
      return res.status(422).json({
        error: `السطر رقم ${i + 1} غير صحيح. الصيغة المطلوبة: رقم_الخدمة | الكمية | الرابط`,
      });
    }

    const srvId = parseInt(parts[0], 10);
    const qty = parseInt(parts[1], 10);
    const link = parts[2];

    const srv = services.find((s) => s.id === srvId && s.status === 'active');
    if (!srv) {
      return res.status(422).json({ error: `الخدمة رقم ${srvId} في السطر ${i + 1} غير موجودة أو معطلة.` });
    }

    if (isNaN(qty) || qty < srv.min || qty > srv.max) {
      return res.status(422).json({
        error: `الكمية في السطر ${i + 1} يجب أن تكون بين ${srv.min.toLocaleString()} و ${srv.max.toLocaleString()}.`,
      });
    }

    if (!link || link.length < 4) {
      return res.status(422).json({ error: `الرابط في السطر ${i + 1} غير صالح.` });
    }

    const charge = parseFloat(((qty / 1000) * srv.rate).toFixed(4));
    totalCost += charge;
    parsedOrders.push({ service: srv, quantity: qty, link, charge });
  }

  if (user.balance < totalCost) {
    return res.status(400).json({
      error: `الرصيد غير كافٍ للطلب الجماعي. التكلفة الإجمالية: $${totalCost.toFixed(2)} (${(totalCost * exchangeRate).toFixed(2)} ج.م) ورصيدك: $${user.balance.toFixed(2)}.`,
    });
  }

  user.balance = parseFloat((user.balance - totalCost).toFixed(4));

  const createdOrders: Order[] = [];
  for (const item of parsedOrders) {
    const cat = categories.find((c) => c.id === item.service.categoryId);
    const newOrd: Order = {
      id: 1000 + orders.length + 1,
      userId: user.id,
      serviceId: item.service.id,
      serviceName: item.service.name,
      categoryName: cat?.name || '',
      link: item.link,
      quantity: item.quantity,
      charge: item.charge,
      chargeEgp: parseFloat((item.charge * exchangeRate).toFixed(2)),
      status: 'pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      provider: SMMFANSFASTER_PROVIDER_STATUS === 'active' ? 'SMMFansFaster' : undefined,
    };
    orders.unshift(newOrd);
    createdOrders.push(newOrd);
  }

  saveDatabase();

  res.status(201).json({
    message: `تم إنشاء ${createdOrders.length} طلبات بنجاح!`,
    orders: createdOrders,
    totalCharge: totalCost,
    remainingBalance: user.balance,
  });
});

// Admin update order status
app.patch('/api/admin/orders/:id/status', (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بإجراء هذه العملية' });
  }

  const orderId = Number(req.params.id);
  const { status } = req.body;
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'الطلب غير موجود' });
  }

  order.status = status;

  // If order cancelled, refund user balance
  if (status === 'cancelled') {
    const client = users.find((u) => u.id === order.userId);
    if (client) {
      client.balance = parseFloat((client.balance + order.charge).toFixed(4));
    }
  }

  saveDatabase();

  res.json({ message: 'تم تحديث حالة الطلب بنجاح', order });
});

// Payment Methods & Manual Deposits
app.get('/api/payment-methods', (req, res) => {
  res.json({
    methods: paymentMethods.map((m) => ({
      ...m,
      exchangeRate,
    })),
    exchangeRate,
    vodafoneNumber: '01205323440',
    instapayAccount: 'menna_206@instapay',
  });
});

// Deposit endpoint
app.post('/api/add-funds/manual', (req, res) => {
  const user = getAuthUser(req);
  const { method_id, amount, sender_phone, proof_image, notes } = req.body;

  const method = paymentMethods.find((m) => m.id === Number(method_id) && m.status === 'active');
  if (!method) {
    return res.status(404).json({ error: 'طريقة الدفع المختارة غير متاحة' });
  }

  const amtEgp = parseFloat(amount);
  if (isNaN(amtEgp) || amtEgp < method.min || (method.max > 0 && amtEgp > method.max)) {
    return res.status(422).json({
      error: `المبلغ يجب أن يكون بين ${method.min} و ${method.max.toLocaleString()} ج.م`,
    });
  }

  if (!sender_phone || String(sender_phone).trim().length < 6) {
    return res.status(422).json({ error: 'يرجى كتابة رقم الهاتف أو الحساب المحول منه بشكل صحيح.' });
  }

  const creditUsd = parseFloat((amtEgp / exchangeRate).toFixed(4));
  const reference = `YD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${user.id}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newTx: Transaction = {
    id: 500 + transactions.length + 1,
    userId: user.id,
    userName: `${user.firstname} ${user.lastname} (${user.username})`,
    reference,
    methodId: method.id,
    methodName: method.name,
    amountEgp: amtEgp,
    amountUsd: creditUsd,
    senderPhone: String(sender_phone).trim(),
    proofData: proof_image || undefined,
    status: 'pending',
    notes: notes || `طلب إيداع عبر ${method.name} - قيد مراجعة الإدارة`,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  transactions.unshift(newTx);
  saveDatabase();

  res.status(201).json({
    message: 'تم إرسال إشعار الإيداع بنجاح! سيتم فحص التحويل من الأدمن وإضافة الرصيد إلى محفظتك.',
    transaction: newTx,
  });
});

// Transactions list
app.get('/api/transactions', (req, res) => {
  const user = getAuthUser(req);
  const isAdmin = user.role === 'admin';

  let list = isAdmin ? [...transactions] : transactions.filter((t) => t.userId === user.id);
  list.sort((a, b) => b.id - a.id);

  res.json({
    transactions: list,
    exchangeRate,
  });
});

// Admin Approve Deposit
app.post('/api/admin/transactions/:id/approve', (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بإجراء هذه العملية' });
  }

  const txId = Number(req.params.id);
  const tx = transactions.find((t) => t.id === txId);

  if (!tx) {
    return res.status(404).json({ error: 'المعاملة غير موجودة' });
  }

  if (tx.status === 'completed') {
    return res.status(400).json({ error: 'هذه المعاملة معتمدة بالفعل مسبقاً.' });
  }

  tx.status = 'completed';

  // Credit user's balance
  const client = users.find((u) => u.id === tx.userId);
  if (client) {
    client.balance = parseFloat((client.balance + tx.amountUsd).toFixed(4));
  }

  saveDatabase();

  res.json({
    message: `تم اعتماد الإيداع بنجاح وإضافة $${tx.amountUsd.toFixed(2)} إلى رصيد العميل!`,
    transaction: tx,
  });
});

// Admin Reject Deposit
app.post('/api/admin/transactions/:id/reject', (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بإجراء هذه العملية' });
  }

  const txId = Number(req.params.id);
  const { reason } = req.body;
  const tx = transactions.find((t) => t.id === txId);

  if (!tx) {
    return res.status(404).json({ error: 'المعاملة غير موجودة' });
  }

  tx.status = 'rejected';
  tx.notes = reason ? `مرفوض: ${reason}` : 'تم رفض الإيداع لعدم تطابق بيانات التحويل';

  saveDatabase();

  res.json({
    message: 'تم رفض الإيداع وتحديث الحالة.',
    transaction: tx,
  });
});

// Admin Users Management
app.get('/api/admin/users', (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك' });
  }

  const result = users.map((u) => {
    const userOrders = orders.filter((o) => o.userId === u.id);
    const totalSpent = userOrders.reduce((sum, o) => sum + o.charge, 0);
    return {
      ...u,
      ordersCount: userOrders.length,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      totalSpentEgp: parseFloat((totalSpent * exchangeRate).toFixed(2)),
      balanceEgp: parseFloat((u.balance * exchangeRate).toFixed(2)),
    };
  });

  res.json(result);
});

// Admin Adjust User Balance
app.post('/api/admin/users/:id/balance', (req, res) => {
  const admin = getAuthUser(req);
  if (admin.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك' });
  }

  const userId = Number(req.params.id);
  const { amount, action, reason } = req.body;
  const targetUser = users.find((u) => u.id === userId);

  if (!targetUser) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const delta = parseFloat(amount);
  if (isNaN(delta) || delta <= 0) {
    return res.status(422).json({ error: 'المبلغ غير صالح' });
  }

  if (action === 'deduct') {
    targetUser.balance = Math.max(0, parseFloat((targetUser.balance - delta).toFixed(4)));
  } else {
    targetUser.balance = parseFloat((targetUser.balance + delta).toFixed(4));
  }

  // Record audit transaction
  transactions.unshift({
    id: 500 + transactions.length + 1,
    userId: targetUser.id,
    userName: `${targetUser.firstname} ${targetUser.lastname}`,
    reference: `ADMIN-ADJ-${Date.now()}`,
    methodId: 0,
    methodName: 'تعديل إداري',
    amountEgp: parseFloat((delta * exchangeRate).toFixed(2)),
    amountUsd: delta,
    senderPhone: 'لوحة الإدارة',
    status: 'completed',
    notes: `${action === 'deduct' ? 'خصم إداري' : 'شحن إداري'}: ${reason || 'لا يوجد سبب مسجل'}`,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  });

  saveDatabase();

  res.json({
    message: 'تم تحديث رصيد المستخدم بنجاح',
    user: targetUser,
  });
});

// Admin Services CRUD
app.post('/api/admin/services', (req, res) => {
  const admin = getAuthUser(req);
  if (admin.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك' });
  }

  const { categoryId, name, type, rate, min, max, description } = req.body;
  const newService: Service = {
    id: 100 + services.length + 1,
    categoryId: Number(categoryId),
    name: name.trim(),
    type: type || 'Default',
    rate: parseFloat(rate),
    min: parseInt(min, 10),
    max: parseInt(max, 10),
    description: description || '',
    status: 'active',
  };

  services.unshift(newService);
  saveDatabase();
  res.status(201).json({ message: 'تمت إضافة الخدمة بنجاح', service: newService });
});

// Admin Settings (Exchange rate)
app.get('/api/settings', (req, res) => {
  res.json({
    usd_egp_rate: exchangeRate,
    site_title: 'البطة الصفرا لخدمات السوشيال ميديا',
    vodafone_number: '01205323440',
    instapay_account: 'menna_206@instapay',
  });
});

app.post('/api/admin/settings/rate', (req, res) => {
  const admin = getAuthUser(req);
  if (admin.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك' });
  }

  const { rate } = req.body;
  const newRate = parseFloat(rate);
  if (isNaN(newRate) || newRate <= 0) {
    return res.status(422).json({ error: 'سعر الصرف غير صالح' });
  }

  exchangeRate = newRate;
  saveDatabase();
  res.json({ message: 'تم تحديث سعر صرف الدولار بنجاح', exchangeRate });
});

// Contact Us
app.post('/api/contact-us', (req, res) => {
  const { name, email, body } = req.body;
  if (!name || !email || !body) {
    return res.status(422).json({ error: 'يرجى ملء جميع الحقول' });
  }
  res.json({ message: 'تم إرسال رسالتك بنجاح! سيتم التواصل معك في أقرب وقت.' });
});

// FAQ list
app.get('/api/faqs', (req, res) => {
  res.json(faqs);
});

// Platform Stats
app.get('/api/stats', (req, res) => {
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const processingOrders = orders.filter((o) => o.status === 'processing').length;
  const totalEarningsUsd = orders.reduce((sum, o) => sum + o.charge, 0);

  res.json({
    totalOrders,
    completedOrders,
    pendingOrders,
    processingOrders,
    activeServices: services.filter((s) => s.status === 'active').length,
    activeUsers: users.length,
    totalEarningsUsd: parseFloat(totalEarningsUsd.toFixed(2)),
    totalEarningsEgp: parseFloat((totalEarningsUsd * exchangeRate).toFixed(2)),
    exchangeRate,
  });
});

// Support Tickets API
app.get('/api/tickets', (req, res) => {
  const user = getAuthUser(req);
  const isAdmin = user.role === 'admin';
  const userTickets = isAdmin ? [...tickets] : tickets.filter((t) => t.userId === user.id);
  userTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ tickets: userTickets });
});

app.post('/api/tickets', (req, res) => {
  const user = getAuthUser(req);
  const { subject, category, orderId, message, priority } = req.body;

  if (!subject || !message) {
    return res.status(422).json({ error: 'الموضوع والرسالة مطلوبان لإنشاء التذكرة' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const newTicket: Ticket = {
    id: 100 + tickets.length + 1,
    userId: user.id,
    userName: `${user.firstname} ${user.lastname}`,
    subject: subject.trim(),
    category: category || 'other',
    orderId: orderId ? Number(orderId) : undefined,
    status: 'open',
    priority: priority || 'normal',
    messages: [
      {
        id: 1,
        sender: 'user',
        senderName: `${user.firstname} ${user.lastname}`,
        message: message.trim(),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  tickets.unshift(newTicket);
  saveDatabase();
  res.status(201).json({ message: 'تم فتح تذكرة الدعم بنجاح! سيتم الرد عليك في أقرب وقت.', ticket: newTicket });
});

app.post('/api/tickets/:id/reply', (req, res) => {
  const user = getAuthUser(req);
  const ticketId = Number(req.params.id);
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(422).json({ error: 'الرسالة لا يمكن أن تكون فارغة' });
  }

  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'التذكرة غير موجودة' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const isSenderAdmin = user.role === 'admin';

  ticket.messages.push({
    id: ticket.messages.length + 1,
    sender: isSenderAdmin ? 'admin' : 'user',
    senderName: isSenderAdmin ? 'دعم البطة الصفرا' : `${user.firstname} ${user.lastname}`,
    message: message.trim(),
    createdAt: now,
  });

  ticket.status = isSenderAdmin ? 'answered' : 'open';
  ticket.updatedAt = now;

  saveDatabase();

  res.json({ message: 'تم إرسال الرد بنجاح', ticket });
});

app.patch('/api/admin/tickets/:id/status', (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك' });
  }

  const ticket = tickets.find((t) => t.id === Number(req.params.id));
  if (!ticket) {
    return res.status(404).json({ error: 'التذكرة غير موجودة' });
  }

  ticket.status = req.body.status;
  ticket.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

  saveDatabase();

  res.json({ message: 'تم تحديث حالة التذكرة بنجاح', ticket });
});

// User Profile Update
app.post('/api/user/profile', (req, res) => {
  const user = getAuthUser(req);
  const { firstname, lastname, email, avatar, password } = req.body;

  if (firstname) user.firstname = firstname.trim();
  if (lastname) user.lastname = lastname.trim();
  if (email) user.email = email.trim();
  if (avatar) user.avatar = avatar;
  if (password && password.length >= 4) user.password = password;

  saveDatabase();

  res.json({
    message: 'تم تحديث بيانات الملف الشخصي بنجاح',
    user: {
      id: user.id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      balance: user.balance,
      balanceEgp: parseFloat((user.balance * exchangeRate).toFixed(2)),
      avatar: user.avatar,
    },
  });
});

// Admin Data Export
app.get('/api/admin/export', (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=yellow-duck-backup-${Date.now()}.json`);
  res.json({
    exportedAt: new Date().toISOString(),
    exchangeRate,
    users: users.map(({ password, ...u }) => u),
    orders,
    transactions,
    tickets,
    services,
    categories,
  });
});

// Admin Data Import / Restore
app.post('/api/admin/import', (req, res) => {
  const user = getAuthUser(req);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك' });
  }

  const { backupData } = req.body;
  if (!backupData) {
    return res.status(422).json({ error: 'بيانات النسخة الاحتياطية مفقودة' });
  }

  try {
    const data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    if (data.users && Array.isArray(data.users)) {
      users.length = 0;
      users.push(...data.users);
    }
    if (data.orders && Array.isArray(data.orders)) {
      orders.length = 0;
      orders.push(...data.orders);
    }
    if (data.transactions && Array.isArray(data.transactions)) {
      transactions.length = 0;
      transactions.push(...data.transactions);
    }
    if (data.tickets && Array.isArray(data.tickets)) {
      tickets.length = 0;
      tickets.push(...data.tickets);
    }
    if (data.services && Array.isArray(data.services)) {
      services.length = 0;
      services.push(...data.services);
    }
    if (data.categories && Array.isArray(data.categories)) {
      categories.length = 0;
      categories.push(...data.categories);
    }
    if (data.exchangeRate) {
      exchangeRate = data.exchangeRate;
    }
    saveDatabase();
    res.json({ message: 'تم استرجاع النسخة الاحتياطية وحفظها بنجاح!' });
  } catch (err: any) {
    res.status(400).json({ error: 'فشل استيراد النسخة: ' + (err.message || 'بيانات غير صالحة') });
  }
});

// Serve static assets from public
app.use(express.static(path.resolve(__dirname, 'public')));

// Environment detection for Railway & Production
const isProduction =
  process.env.NODE_ENV === 'production' ||
  !!process.env.RAILWAY_ENVIRONMENT ||
  !!process.env.RAILWAY_STATIC_URL;

if (!isProduction) {
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } catch (err) {
    console.warn('Vite dev middleware could not be loaded, falling back to dist static files:', err);
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
} else {
  // In production, serve built files from dist
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const server = app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🐥 Yellow Duck SMM is RUNNING on http://${HOST}:${PORT}`);
  console.log(`🚀 Railway Ready | Port: ${PORT} | Health: /health`);
  console.log(`=======================================================`);
});

// Graceful shutdown for Railway & Docker containers
const handleShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down Yellow Duck server gracefully...`);
  server.close(() => {
    console.log('Server closed. Goodbye!');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

