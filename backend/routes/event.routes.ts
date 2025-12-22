import express from 'express';
import type { Request, Response } from 'express';
import  Event from '../models/Event.ts';
import type { IEvent } from '../models/Event.ts';
import  User from '../models/User.ts';
import auth from '../middleware/auth.ts';

const router = express.Router();
// @route   POST api/events
// @desc    Create a new event
// @access  Private
router.post('/', auth, async (req: Request, res: Response) => {
  const { name, day, startingHour, endingHour, place, memberLimit } = req.body;

  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'User not authenticated' });
    }

    const newEvent = new Event({
      name,
      day,
      startingHour,
      endingHour,
      place,
      memberLimit,
      creator: req.user.id
    });

    const event = await newEvent.save();

    // Add event to creator's eventsCreated array
    const user = await User.findById(req.user.id);
    if (user) {
      user.eventsCreated.unshift(event._id);
      await user.save();
    }

    res.json(event);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await Event.find().populate('creator', ['username']).populate('participants', ['username']);
    res.json(events);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/events/:id
// @desc    Get single event by ID
// @access  Public
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id).populate('creator', ['username']).populate('participants', ['username']);

    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    res.json(event);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/events/:id
// @desc    Update an event
// @access  Private (Creator only)
router.put('/:id', auth, async (req: Request, res: Response) => {
  const { name, day, startingHour, endingHour, place, memberLimit } = req.body;

  // Build event object
  const eventFields: Partial<IEvent> = {};
  if (name) eventFields.name = name;
  if (day) eventFields.day = day;
  if (startingHour) eventFields.startingHour = startingHour;
  if (endingHour) eventFields.endingHour = endingHour;
  if (place) eventFields.place = place;
  if (memberLimit) eventFields.memberLimit = memberLimit;

  try {
    let event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ msg: 'Event not found' });

    if (!req.user) {
      return res.status(401).json({ msg: 'User not authenticated' });
    }

    // Check if user is creator
    if (event.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id, { $set: eventFields }, { new: true }
    );

    res.json(event);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/events/:id
// @desc    Delete an event
// @access  Private (Creator only)
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ msg: 'Event not found' });

    if (!req.user) {
      return res.status(401).json({ msg: 'User not authenticated' });
    }

    // Check if user is creator
    if (event.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Event.findByIdAndDelete(req.params.id);

    // Remove event from creator's eventsCreated array
    const user = await User.findById(req.user.id);
    if (user) {
      user.eventsCreated = user.eventsCreated.filter(
        (eventId) => eventId.toString() !== req.params.id
      );
      await user.save();
    }


    res.json({ msg: 'Event removed' });
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/events/participate/:id
// @desc    Participate in an event
// @access  Private
router.put('/participate/:id', auth, async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!req.user) {
      return res.status(401).json({ msg: 'User not authenticated' });
    }
    const user = await User.findById(req.user.id);

    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Check if user already participated
    if (event.participants.includes(user._id)) {
      return res.status(400).json({ msg: 'Already participating in this event' });
    }

    // Check if event is full
    if (event.participants.length >= event.memberLimit) {
      return res.status(400).json({ msg: 'Event is full' });
    }

    event.participants.unshift(user._id);
    user.eventsParticipated.unshift(event._id);

    await event.save();
    await user.save();

    res.json(event.participants);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/events/unparticipate/:id
// @desc    Cancel participation in an event
// @access  Private
router.put('/unparticipate/:id', auth, async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!req.user) {
      return res.status(401).json({ msg: 'User not authenticated' });
    }
    const user = await User.findById(req.user.id);

    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Check if user is not participating
    if (!event.participants.includes(user._id)) {
      return res.status(400).json({ msg: 'User not participating in this event' });
    }

    // Remove user from participants array
    event.participants = event.participants.filter(
      (participant) => participant.toString() !== user._id.toString()
    );
    // Remove event from user's eventsParticipated array
    user.eventsParticipated = user.eventsParticipated.filter(
      (eventId) => eventId.toString() !== req.params.id
    );

    await event.save();
    await user.save();

    res.json(event.participants);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

export default router;