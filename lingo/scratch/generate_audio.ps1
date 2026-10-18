Add-Type -AssemblyName System.Speech

$clips = @(
    @{ file = "pre-a1-listening-01.wav"; text = "Hello! My name is Anna. I am a student. I like apples and books. Nice to meet you!" },
    @{ file = "pre-a1-listening-02.wav"; text = "Good morning. Please open your books to page ten. Listen to the teacher and write your name." },
    @{ file = "a1-listening-01.wav"; text = "Welcome to the Green Café! We have fresh coffee, tea, and warm croissants. Breakfast is served until eleven in the morning." },
    @{ file = "a1-listening-02.wav"; text = "Excuse me, where is the train station? Walk straight for two blocks, then turn left at the library. It is next to the post office." },
    @{ file = "a2-listening-01.wav"; text = "Last weekend, I visited the city museum with my brother. We took the subway and arrived at ten o'clock. The history exhibition was fascinating, but the museum café was quite crowded." },
    @{ file = "b1-listening-01.wav"; text = "Thank you for calling City Dental Clinic. Our office is open Monday through Friday from eight thirty AM to five PM. If you are experiencing a medical emergency, please hang up and call nine one one." },
    @{ file = "b2-listening-01.wav"; text = "In today's seminar, we will examine the environmental impact of renewable urban infrastructure. While initial capital expenditure remains high, long-term operational efficiency consistently offsets municipal costs." },
    @{ file = "c1-listening-01.wav"; text = "The paradox of modern automation lies in the subtle shifting of cognitive burden. Rather than rendering human oversight redundant, complex algorithms inadvertently elevate the necessity of critical judgment." },
    @{ file = "c2-listening-01.wav"; text = "Linguistic nuance frequently eludes rigid computational taxonomy. Semantic ambiguity and socio-pragmatic undertones often convey precisely what explicit lexical choices leave unsaid." },
    @{ file = "pron-hello.wav"; text = "Hello, nice to meet you." },
    @{ file = "pron-weather.wav"; text = "The weather is lovely and warm today." },
    @{ file = "pron-coffee.wav"; text = "Could I please have a cup of black coffee?" },
    @{ file = "pron-directions.wav"; text = "Excuse me, where is the nearest subway station?" },
    @{ file = "pron-interview.wav"; text = "I have five years of experience in project management." },
    @{ file = "pron-nuance.wav"; text = "Subtle linguistic nuance enriches human communication." }
)

$outDir = Join-Path $PSScriptRoot "..\public\audio"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0

foreach ($clip in $clips) {
    $filePath = Join-Path $outDir $clip.file
    $synth.SetOutputToWaveFile($filePath)
    $synth.Speak($clip.text)
    $size = (Get-Item $filePath).Length
    Write-Output "Generated $($clip.file): $size bytes"
}

$synth.Dispose()
Write-Output "ALL AUDIO CLIPS GENERATED SUCCESSFULLY"
