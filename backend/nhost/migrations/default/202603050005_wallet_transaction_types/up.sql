DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_type') THEN
    CREATE TYPE public.wallet_transaction_type AS ENUM (
      'participation_reward',
      'run_validation_reward',
      'daily_login_reward',
      'rating_reward'
    );
  END IF;
END $$;

ALTER TABLE public.wallet_ledger
ADD COLUMN IF NOT EXISTS transaction_type public.wallet_transaction_type,
ADD COLUMN IF NOT EXISTS reference_key text,
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.wallet_ledger
SET transaction_type = CASE
  WHEN reason ILIKE '%validation%' THEN 'run_validation_reward'::public.wallet_transaction_type
  ELSE 'participation_reward'::public.wallet_transaction_type
END
WHERE transaction_type IS NULL;

ALTER TABLE public.wallet_ledger
ALTER COLUMN transaction_type SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_reference_key
ON public.wallet_ledger(reference_key)
WHERE reference_key IS NOT NULL;
