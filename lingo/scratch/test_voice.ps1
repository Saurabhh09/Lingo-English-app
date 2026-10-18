Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile("test_voice.wav")
$synth.Speak("Hello and welcome to Lingo English Practice.")
$synth.Dispose()
Write-Output (Test-Path "test_voice.wav")
