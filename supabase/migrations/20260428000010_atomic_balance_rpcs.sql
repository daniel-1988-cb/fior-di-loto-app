-- Atomic RPCs per evitare race conditions su dati finanziari
-- 1. increment_client_totals: UPDATE atomico totale_speso/totale_visite
-- 2. insert_wallet_transaction_atomic: locka l'ultima riga wallet con FOR UPDATE
-- 3. apply_loyalty_points_atomic: UPDATE atomico clients.punti

CREATE OR REPLACE FUNCTION increment_client_totals(
  p_client_id UUID,
  p_speso_delta NUMERIC DEFAULT 0,
  p_visite_delta INT DEFAULT 0
)
RETURNS TABLE (totale_speso NUMERIC, totale_visite INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE clients
  SET
    totale_speso = COALESCE(clients.totale_speso, 0) + p_speso_delta,
    totale_visite = COALESCE(clients.totale_visite, 0) + p_visite_delta,
    updated_at = NOW()
  WHERE clients.id = p_client_id
  RETURNING clients.totale_speso, clients.totale_visite;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_client_totals(UUID, NUMERIC, INT) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION insert_wallet_transaction_atomic(
  p_client_id UUID,
  p_tipo VARCHAR,
  p_importo NUMERIC,
  p_descrizione TEXT,
  p_appointment_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, saldo_dopo NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_signed_importo NUMERIC;
  v_new_balance NUMERIC;
  v_id UUID;
BEGIN
  IF p_tipo IN ('ricarica', 'rimborso') THEN
    v_signed_importo := ABS(p_importo);
  ELSIF p_tipo = 'utilizzo' THEN
    v_signed_importo := -ABS(p_importo);
  ELSIF p_tipo = 'aggiustamento' THEN
    v_signed_importo := p_importo;
  ELSE
    RAISE EXCEPTION 'Tipo non valido: %', p_tipo;
  END IF;

  -- Lock the latest row to serialize concurrent inserts
  SELECT COALESCE(t.saldo_dopo, 0) INTO v_current_balance
  FROM client_wallet_transactions t
  WHERE t.client_id = p_client_id
  ORDER BY t.created_at DESC, t.id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  v_new_balance := v_current_balance + v_signed_importo;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Saldo insufficiente: corrente %, richiesto %', v_current_balance, ABS(v_signed_importo);
  END IF;

  INSERT INTO client_wallet_transactions (
    client_id, tipo, importo, descrizione, saldo_dopo,
    appointment_id, transaction_id, created_by
  )
  VALUES (
    p_client_id, p_tipo, v_signed_importo, p_descrizione, v_new_balance,
    p_appointment_id, p_transaction_id, p_created_by
  )
  RETURNING client_wallet_transactions.id INTO v_id;

  RETURN QUERY SELECT v_id, v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_wallet_transaction_atomic TO authenticated, service_role;


CREATE OR REPLACE FUNCTION apply_loyalty_points_atomic(
  p_client_id UUID,
  p_delta INT
)
RETURNS TABLE (punti_after INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_points INT;
BEGIN
  UPDATE clients
  SET punti = COALESCE(clients.punti, 0) + p_delta
  WHERE clients.id = p_client_id
  RETURNING clients.punti INTO v_new_points;

  IF v_new_points IS NULL THEN
    RAISE EXCEPTION 'Cliente non trovato: %', p_client_id;
  END IF;

  IF v_new_points < 0 THEN
    UPDATE clients SET punti = COALESCE(clients.punti, 0) - p_delta WHERE clients.id = p_client_id;
    RAISE EXCEPTION 'Punti insufficienti: dopo delta % sarebbero negativi', p_delta;
  END IF;

  RETURN QUERY SELECT v_new_points;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_loyalty_points_atomic TO authenticated, service_role;
