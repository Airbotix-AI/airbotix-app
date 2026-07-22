export interface PortalVenue {
  name: string;
  address_line: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface PortalClassSummary {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  delivery_mode: string;
  venue: PortalVenue | null;
  course_pack: { id: string; slug: string; title: string } | null;
  teaching_team?: import('./teachers/teacherApi').PublicTeachingTeamMember[];
}

export interface MyClassesResponse {
  enrollments: Array<{
    id: string;
    status: string;
    enrolled_at: string;
    kid: { id: string; nickname: string; age: number };
    class: PortalClassSummary;
  }>;
  pending_orders: Array<{
    payment_intent_id: string;
    amount_aud_cents: number;
    created_at: string;
    class: PortalClassSummary | null;
  }>;
  booking_requests: Array<{
    id: string;
    status: string;
    parent_status: 'received' | 'contacted' | 'confirmed' | 'closed';
    source: string;
    created_at: string;
    kid: { id: string; nickname: string; age: number } | null;
    course_pack: { id: string; slug: string; title: string } | null;
  }>;
}

export const bookingStatusCopy: Record<string, string> = {
  received: 'Received',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  closed: 'Closed',
};

export const dateTimeLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const venueLabel = (venue: PortalVenue | null) =>
  venue ? `${venue.name}, ${venue.suburb}${venue.city ? `, ${venue.city}` : ''}` : 'Online';
