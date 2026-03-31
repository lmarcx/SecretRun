import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.HASURA_GRAPHQL_URL ??= 'http://localhost:8080/v1/graphql';
process.env.HASURA_ADMIN_SECRET ??= 'test-secret';
process.env.NHOST_JWT_PUBLIC_KEY ??= 'test-public-key';

async function loadEventServiceModules() {
  const [hasura, eventsService] = await Promise.all([import('../../lib/hasura'), import('./service')]);

  return {
    hasura,
    eventsService,
  };
}

const publicEvent = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  title: 'Sunrise Bridge Dash',
  description: 'Public event',
  reveal_at: '2026-04-01T18:00:00.000Z',
  starts_at: '2026-04-01T20:00:00.000Z',
  ends_at: '2026-04-01T22:00:00.000Z',
  start_area_radius_km: 1.5,
  start_area_center: { type: 'Point', coordinates: [-6.2603, 53.3498] },
  team_id: null,
  is_private: false,
  created_by: '11111111-1111-4111-8111-111111111111',
};

const privateTeamEvent = {
  ...publicEvent,
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4',
  title: 'Night Owls Relay Brief',
  team_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  is_private: true,
};

afterEach(() => {
  mock.restoreAll();
});

describe('events service guest visibility', () => {
  it('lists only public events for guests and masks sensitive location fields', async () => {
    const { hasura, eventsService } = await loadEventServiceModules();

    mock.method(hasura, 'requestHasura', async () => ({
      events: [publicEvent, privateTeamEvent],
    }));

    const result = await eventsService.listEvents(null);

    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, publicEvent.id);
    assert.equal(result[0]?.startAreaCenter, null);
  });

  it('returns public event detail to guests without sensitive location fields', async () => {
    const { hasura, eventsService } = await loadEventServiceModules();

    mock.method(hasura, 'requestHasura', async () => ({
      event: publicEvent,
      participant_count: {
        aggregate: {
          count: 12,
        },
      },
    }));

    const result = await eventsService.getEvent(null, publicEvent.id);

    assert.ok(result);
    assert.equal(result.id, publicEvent.id);
    assert.equal(result.participantCount, 12);
    assert.equal(result.startAreaCenter, null);
  });

  it('hides team and private event detail from guests', async () => {
    const { hasura, eventsService } = await loadEventServiceModules();

    mock.method(hasura, 'requestHasura', async () => ({
      event: privateTeamEvent,
      participant_count: {
        aggregate: {
          count: 4,
        },
      },
    }));

    const result = await eventsService.getEvent(null, privateTeamEvent.id);

    assert.equal(result, null);
  });
});

describe('events service authenticated visibility', () => {
  it('keeps sensitive location fields masked for team members until they join', async () => {
    const { hasura, eventsService } = await loadEventServiceModules();

    mock.method(hasura, 'requestHasura', async () => ({
      event: privateTeamEvent,
      participant: [],
      memberships: [
        {
          team_id: privateTeamEvent.team_id,
        },
      ],
      participant_count: {
        aggregate: {
          count: 5,
        },
      },
    }));

    const result = await eventsService.getEvent('33333333-3333-4333-8333-333333333333', privateTeamEvent.id);

    assert.ok(result);
    assert.equal(result.startAreaCenter, null);
  });

  it('reveals sensitive location fields to registered participants', async () => {
    const { hasura, eventsService } = await loadEventServiceModules();

    mock.method(hasura, 'requestHasura', async () => ({
      event: publicEvent,
      participant: [
        {
          status: 'registered',
          joined_at: '2026-03-31T10:00:00.000Z',
        },
      ],
      memberships: [],
      participant_count: {
        aggregate: {
          count: 9,
        },
      },
    }));

    const result = await eventsService.getEvent('22222222-2222-4222-8222-222222222222', publicEvent.id);

    assert.ok(result);
    assert.deepEqual(result.startAreaCenter, publicEvent.start_area_center);
    assert.equal(result.viewerParticipationStatus, 'registered');
  });
});
