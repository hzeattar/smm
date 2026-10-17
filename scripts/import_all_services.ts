import fs from 'fs';
import path from 'path';

async function importAllServices() {
  console.log('Fetching all services from SMMFansFaster API...');
  const formData = new URLSearchParams();
  formData.append('key', 'da3e5d9d501bc1ea0a9c020c9f7fe01a');
  formData.append('action', 'services');

  const res = await fetch('https://smmfansfaster.com/api/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const rawServices: any = await res.json();
  if (!Array.isArray(rawServices)) {
    console.error('Failed to fetch from SMMFansFaster:', rawServices);
    process.exit(1);
  }

  console.log(`Successfully fetched ${rawServices.length} raw services from SMMFansFaster.`);

  const categories = [
    { id: 1, name: 'إنستغرام - Instagram', slug: 'instagram', icon: '/images/platforms/instagram.svg', status: 'active' },
    { id: 2, name: 'تيك توك - TikTok', slug: 'tiktok', icon: '/images/platforms/tiktok.svg', status: 'active' },
    { id: 3, name: 'يوتيوب - YouTube', slug: 'youtube', icon: '/images/platforms/youtube.svg', status: 'active' },
    { id: 4, name: 'فيسبوك - Facebook', slug: 'facebook', icon: '/images/platforms/facebook.svg', status: 'active' },
    { id: 5, name: 'تيليجرام - Telegram', slug: 'telegram', icon: '/images/platforms/telegram.svg', status: 'active' },
    { id: 6, name: 'إكس - X (Twitter)', slug: 'x', icon: '/images/platforms/x.svg', status: 'active' },
    { id: 7, name: 'سبوتيفاي - Spotify', slug: 'spotify', icon: '/images/platforms/spotify.svg', status: 'active' },
    { id: 8, name: 'سناب شات - Snapchat', slug: 'snapchat', icon: '/images/platforms/snapchat.svg', status: 'active' },
    { id: 9, name: 'ثريدز وكواي - Threads & Kwai', slug: 'threads-kwai', icon: '/images/platforms/tiktok.svg', status: 'active' },
    { id: 10, name: 'ديسكورد ولينكد إن - Discord & LinkedIn', slug: 'discord-linkedin', icon: '/images/platforms/discord.svg', status: 'active' },
    { id: 11, name: 'زيارات وترافيك مواقع - Website Traffic', slug: 'traffic', icon: '/images/platforms/youtube.svg', status: 'active' },
    { id: 12, name: 'خدمات رقمية متنوعة - Other Digital', slug: 'other', icon: '/brand/yellow-duck.svg', status: 'active' },
  ];

  function getCatId(catName: string, name: string): number {
    const text = (catName + ' ' + name).toLowerCase();
    if (text.includes('instagram') || text.includes('إنستغرام')) return 1;
    if (text.includes('tiktok') || text.includes('تيك توك')) return 2;
    if (text.includes('youtube') || text.includes('يوتيوب')) return 3;
    if (text.includes('facebook') || text.includes('فيسبوك')) return 4;
    if (text.includes('telegram') || text.includes('تيليجرام')) return 5;
    if (text.includes('twitter') || text.includes('تويتر') || text.includes(' x ') || text.includes('إكس')) return 6;
    if (text.includes('spotify') || text.includes('سبوتيفاي') || text.includes('soundcloud')) return 7;
    if (text.includes('snapchat') || text.includes('سناب')) return 8;
    if (text.includes('threads') || text.includes('ثريدز') || text.includes('kwai') || text.includes('كواي')) return 9;
    if (text.includes('discord') || text.includes('ديسكورد') || text.includes('linkedin') || text.includes('twitch')) return 10;
    if (text.includes('traffic') || text.includes('website') || text.includes('visitor') || text.includes('seo') || text.includes('زوار')) return 11;
    return 12;
  }

  const marginMultiplier = 1.10; // 10% standard profit margin

  const services = rawServices.map((raw: any) => {
    const provId = Number(raw.service);
    const origRate = parseFloat(raw.rate) || 0.5;
    const calcRate = parseFloat((origRate * marginMultiplier).toFixed(4));
    const catId = getCatId(raw.category || '', raw.name || '');

    return {
      id: provId,
      categoryId: catId,
      name: raw.name,
      type: raw.type || 'Default',
      rate: calcRate,
      originalRate: origRate,
      min: parseInt(raw.min, 10) || 10,
      max: parseInt(raw.max, 10) || 100000,
      description: `خدمة أوتوماتيكية عبر سيرفرات SMMFansFaster (${raw.category || ''}). تنفيذ فوري وآمن.`,
      status: 'active',
      provider: 'SMMFansFaster',
      providerServiceId: provId,
      categoryName: raw.category || '',
    };
  });

  const dbPath = path.resolve('data/yellow_duck_db.json');
  let db: any = {};
  if (fs.existsSync(dbPath)) {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
  db.categories = categories;
  db.services = services;
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

  console.log(`Successfully stored ${services.length} services across ${categories.length} categories in ${dbPath}`);
}

importAllServices().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
