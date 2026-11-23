-- One-time encrypted handoff for the separate sandbox console. No password is
-- committed or stored in migration history. Remove the temporary Vault secret
-- after saving it as a sensitive environment variable in the console project.
DO $$
DECLARE generated_password text;
BEGIN
 generated_password:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 EXECUTE format('ALTER ROLE medicea_console_server LOGIN PASSWORD %L',generated_password);
 PERFORM vault.create_secret(generated_password,'medicea_console_bootstrap_password','Temporary encrypted handoff to the restricted sandbox console');
END $$;
