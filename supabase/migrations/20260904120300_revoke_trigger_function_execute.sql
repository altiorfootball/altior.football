-- Die Trigger-Funktion wird von der Datenbank beim INSERT gefeuert und braucht
-- dafuer kein EXECUTE-Recht fuer API-Rollen. Ohne dieses Recht verschwindet sie
-- als aufrufbarer REST-Endpunkt, der Trigger arbeitet unveraendert weiter.

revoke execute on function public.enforce_max_two_evolution_enrollments() from public, anon, authenticated;
