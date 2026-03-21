-- Migration: Admin Panel Support
-- Добавляет поле is_admin в профили и создаёт admin_logs таблицу

-- 1. Добавляем поле is_admin в profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Создаём индекс для быстрых запросов админов
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- 3. Таблица логов действий администратора
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- 4. RLS политики для admin_logs
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Только админы могут видеть логи
CREATE POLICY "Admins can view all logs" ON admin_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Только админы могут создавать логи (через service role)
CREATE POLICY "Service role can insert logs" ON admin_logs
  FOR INSERT
  WITH CHECK (true);

-- 5. Обновляем RLS для profiles — админы видят всех
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- 6. Назначаем первого админа (замени email на свой!)
UPDATE profiles 
SET is_admin = true 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'admin@liveclick.ai' 
  LIMIT 1
);

COMMENT ON COLUMN profiles.is_admin IS 'Флаг администратора — доступ к /admin панели';
COMMENT ON TABLE admin_logs IS 'Логи всех действий администраторов для аудита';
