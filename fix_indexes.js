const fs = require('fs');
let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\backend\\models.js', 'utf8');

// Add indexes to TelemetryEvent and CheckpointAttempt
content = content.replace(
  "const TelemetryEvent = mongoose.model('TelemetryEvent', TelemetryEventSchema);",
  "TelemetryEventSchema.index({ courseSlug: 1, lessonId: 1, eventType: 1 });\nconst TelemetryEvent = mongoose.model('TelemetryEvent', TelemetryEventSchema);"
);

content = content.replace(
  "const CheckpointAttempt = mongoose.model('CheckpointAttempt', CheckpointAttemptSchema);",
  "CheckpointAttemptSchema.index({ courseSlug: 1, questionId: 1 });\nconst CheckpointAttempt = mongoose.model('CheckpointAttempt', CheckpointAttemptSchema);"
);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\backend\\models.js', content, 'utf8');
console.log('Added Mongoose Indexes!');
