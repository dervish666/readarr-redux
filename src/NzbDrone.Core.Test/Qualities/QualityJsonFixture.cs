using System.Data.SQLite;
using System.Text.Json;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Common.Serializer;
using NzbDrone.Core.Datastore.Converters;
using NzbDrone.Core.MediaFiles.BookImport.Manual;
using NzbDrone.Core.Qualities;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Qualities
{
    [TestFixture]
    public class QualityJsonFixture : CoreTest
    {
        // POST /api/v1/command reads the body with STJson, as CommandController does
        private ManualImportCommand ReadManualImport(string quality)
        {
            var body = "{\"name\":\"ManualImport\",\"files\":[{\"path\":\"/downloads/usenet/complete/audiobooks/Book/BMAR32-56 Book.mp3\"," +
                       "\"authorId\":2456,\"bookId\":40224712,\"foreignEditionId\":\"9758412\"," +
                       "\"quality\":{\"quality\":" + quality + ",\"revision\":{\"version\":1,\"real\":0,\"isRepack\":false}}," +
                       "\"indexerFlags\":0,\"disableReleaseSwitching\":false}],\"importMode\":\"auto\",\"replaceExistingFiles\":false}";

            return (ManualImportCommand)STJson.Deserialize(body, typeof(ManualImportCommand));
        }

        [Test]
        public void should_read_a_quality_sent_as_an_object()
        {
            // What the UI and the API docs send
            ReadManualImport("{\"id\":10,\"name\":\"MP3\"}").Files[0].Quality.Quality.Should().Be(Quality.MP3);
        }

        [Test]
        public void should_read_a_quality_sent_as_its_id()
        {
            // How the database stores it, and what a script reading BookFiles or History gets
            var quality = ReadManualImport("10").Files[0].Quality.Quality;

            quality.Should().Be(Quality.MP3);
            quality.Name.Should().Be("MP3");
        }

        [Test]
        public void should_read_a_quality_sent_as_its_name()
        {
            ReadManualImport("\"m4b\"").Files[0].Quality.Quality.Should().Be(Quality.M4B);
        }

        [Test]
        public void should_read_an_object_with_only_an_id()
        {
            ReadManualImport("{\"id\":12}").Files[0].Quality.Quality.Name.Should().Be("M4B");
        }

        [TestCase("14")]
        [TestCase("99")]
        [TestCase("-1")]
        [TestCase("\"MP4\"")]
        public void should_reject_an_unknown_quality_with_a_json_error(string quality)
        {
            Assert.Throws<JsonException>(() => ReadManualImport(quality));
        }

        [Test]
        public void should_write_a_quality_as_an_object()
        {
            var json = STJson.ToJson(new QualityModel(Quality.MP3));

            using var document = JsonDocument.Parse(json);
            var quality = document.RootElement.GetProperty("quality");

            quality.GetProperty("id").GetInt32().Should().Be(10);
            quality.GetProperty("name").GetString().Should().Be("MP3");
        }

        [Test]
        public void should_keep_storing_a_quality_as_its_id()
        {
            var param = new SQLiteParameter();

            new EmbeddedDocumentConverter<QualityModel>(new QualityIntConverter()).SetValue(param, new QualityModel(Quality.MP3));

            using var document = JsonDocument.Parse((string)param.Value);
            document.RootElement.GetProperty("quality").GetInt32().Should().Be(10);
        }
    }
}
