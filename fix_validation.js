const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', 'utf8');

// 1. Add Zod import
content = content.replace("const multer = require('multer');", "const multer = require('multer');\nconst { z } = require('zod');");

// 2. Add validation schema for telemetry
const telemetryCode = `
app.post('/api/telemetry/event', async (req, res) => {
  try {
    const EventSchema = z.object({
      userId: z.string().min(1),
      courseSlug: z.string().min(1),
      lessonId: z.string().min(1),
      eventType: z.enum(['video_started', 'video_paused', 'video_ended', 'seek']),
      videoTimeSeconds: z.number().nonnegative(),
      playbackRate: z.number().positive().optional()
    });

    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }
    const { userId, courseSlug, lessonId, eventType, videoTimeSeconds, playbackRate } = parsed.data;

    // TODO: A jwt middleware would override parsed.data.userId here

    const event = new TelemetryEvent({
      userId,
      courseSlug,
      lessonId,
      eventType,
      videoTimeSeconds,
      playbackRate
    });
    await event.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

content = content.replace(/app\.post\('\/api\/telemetry\/event'[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\s*\}\s*\}\);/, telemetryCode.trim());

// 3. Add validation schema for heartbeat
const heartbeatCode = `
app.post('/api/progress/heartbeat', async (req, res) => {
  try {
    const HeartbeatSchema = z.object({
      userId: z.string().min(1),
      courseSlug: z.string().min(1),
      lessonId: z.string().min(1),
      currentSecond: z.number().nonnegative(),
      durationSeconds: z.number().positive(),
      range: z.tuple([z.number(), z.number()])
    });

    const parsed = HeartbeatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }
    const { userId, courseSlug, lessonId, currentSecond, durationSeconds, range } = parsed.data;
`;
content = content.replace(/app\.post\('\/api\/progress\/heartbeat', async \(req, res\) => \{\s*try \{\s*const \{ userId, courseSlug, lessonId, currentSecond, durationSeconds, range \} = req\.body;/, heartbeatCode.trim());

fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\server.js', content, 'utf8');
console.log('Added Zod validation to server.js');
