-- SQL para crear las tablas usadas por el backend `baken` en Supabase
-- Ejecutar en SQL editor de Supabase

-- Habilitar pgcrypto para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tabla de subscripciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  endpoint text NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- índice para búsquedas por endpoint (evitar duplicados si se desea unique)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions USING btree (endpoint);

-- 2) Tabla de logs de notificaciones
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NULL,
  subscription_id uuid NULL REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  sent_at timestamptz DEFAULT now(),
  delivered boolean DEFAULT false,
  response text NULL
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment ON public.notification_logs USING btree (appointment_id);

-- 3) Asegurar/alterar la tabla de citas `barber_teste`
-- Si ya existe, añadimos columnas necesarias; si no existe, creamos una versión mínima.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='barber_teste') THEN
    CREATE TABLE public.barber_teste (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      name text,
      date date,
      time text,
      service text,
      appointment_at timestamptz NULL,
      notification_at timestamptz NULL,
      notification_sent boolean DEFAULT false
    );
  ELSE
    -- agregar columnas si no existen
    BEGIN
      ALTER TABLE public.barber_teste ADD COLUMN IF NOT EXISTS appointment_at timestamptz;
      ALTER TABLE public.barber_teste ADD COLUMN IF NOT EXISTS notification_at timestamptz;
      ALTER TABLE public.barber_teste ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN
      -- ya existe, ignorar
      NULL;
    END;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_barber_teste_notification_at ON public.barber_teste (notification_at);
CREATE INDEX IF NOT EXISTS idx_barber_teste_notification_sent ON public.barber_teste (notification_sent);

-- 4) Tabla services (si no existe)
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  price numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- Notas:
-- - push_subscriptions.subscription guarda el JSON completo que proviene del Service Worker (endpoint y keys).
-- - Las funciones del backend usan la clave service_role para escribir en estas tablas.
-- - Revisar y aplicar políticas RLS apropiadas si vas a permitir escrituras directas desde el cliente.

-- Ejemplo de inserción básica (opcional) para pruebas:
-- INSERT INTO public.services (title, description, price) VALUES ('Corte', 'Corte de pelo', 10.00);

-- Fin del script
