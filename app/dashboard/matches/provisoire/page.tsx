import { redirect } from 'next/navigation';

// La planification du squelette est désormais intégrée dans le hub
// /matches/calendar via le toggle Brouillon/Officiel. On garde cette
// route pour compatibilité des liens existants.
export default async function DraftCalendarRedirect() {
  redirect('/dashboard/matches/calendar?mode=brouillon');
}
