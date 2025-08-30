export interface SubtitleCue {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

// Convert SRT time format (00:01:30,500) to seconds
function parseTimeToSeconds(timeString: string): number {
  const [time, milliseconds] = timeString.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
}

// Parse SRT subtitle content
export function parseSRT(content: string): SubtitleCue[] {
  const subtitles: SubtitleCue[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const id = parseInt(lines[0], 10);
    const timeLine = lines[1];
    const text = lines.slice(2).join('\n');

    if (timeLine.includes(' --> ')) {
      const [startTime, endTime] = timeLine.split(' --> ');
      subtitles.push({
        id,
        startTime: parseTimeToSeconds(startTime.trim()),
        endTime: parseTimeToSeconds(endTime.trim()),
        text: text.trim(),
      });
    }
  }

  return subtitles;
}

// Get current subtitle based on video time with delay adjustment
export function getCurrentSubtitle(subtitles: SubtitleCue[], currentTime: number, delay: number = 0): SubtitleCue | null {
  const adjustedTime = currentTime + delay;
  return subtitles.find(
    subtitle => adjustedTime >= subtitle.startTime && adjustedTime <= subtitle.endTime
  ) || null;
}