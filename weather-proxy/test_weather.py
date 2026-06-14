import unittest

# Import should be name of proxy file
# If not, just paste the shorten_forecast function directly above this class for testing
from weather_proxy import shorten_forecast 

class TestWeatherShortener(unittest.TestCase):

    def test_multi_word_phrases(self):
        """Tests that longer phrases are swapped correctly without breaking."""
        result = shorten_forecast("Mostly Cloudy")
        self.assertEqual(result, "M. Cldy")
        
        result = shorten_forecast("Chance Showers And Thunderstorms")
        self.assertEqual(result, "Chc TStorm")

    def test_single_words(self):
        """Tests single word replacements."""
        result = shorten_forecast("Light Drizzle")
        self.assertEqual(result, "Lgt Drzzl")

    def test_unmapped_words_are_kept(self):
        """Tests that words NOT in the dictionary are left alone."""
        # 'With' and 'Some' aren't in your dictionary, so they should remain untouched
        result = shorten_forecast("Mostly Cloudy With Some Light Rain")
        self.assertEqual(result, "M. Cldy With Some Lgt Rain")

if __name__ == '__main__':
    unittest.main()
