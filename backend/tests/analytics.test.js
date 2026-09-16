const { getUnifiedEventAnalytics } = require('../services/analytics/analyticsService');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const CheckIn = require('../models/CheckIn');

jest.mock('../models/Event');
jest.mock('../models/Registration');
jest.mock('../models/CheckIn');
jest.mock('../models/Session', () => {
  const arr = [];
  arr.populate = jest.fn().mockReturnThis();
  // Allow thenable to resolve to itself so await works
  arr.then = (res) => res(arr);
  return {
    find: jest.fn().mockReturnValue(arr)
  };
});
jest.mock('../models/Feedback', () => ({
  find: jest.fn().mockResolvedValue([])
}));
jest.mock('../models/Alert', () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue({})
}));

describe('Analytics Intelligence Engine (Deterministic)', () => {
  it('should flag HIGH capacity risk if near capacity', async () => {
    Event.findById.mockResolvedValue({ _id: 'e1', title: 'Test Event', requiredCapacity: 100 });
    
    // Mock 96 approved registrations
    Registration.find.mockReturnThis();
    Registration.populate.mockResolvedValue(
      Array(96).fill({ status: 'APPROVED', attendee: {} })
    );
    CheckIn.find.mockResolvedValue(Array(50).fill({}));
    CheckIn.countDocuments = jest.fn().mockResolvedValue(0);

    const stats = await getUnifiedEventAnalytics('e1');
    expect(stats.intelligence.risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'CAPACITY', level: 'HIGH' })
      ])
    );
    expect(stats.capacityUtilization).toBe(96);
  });
});
