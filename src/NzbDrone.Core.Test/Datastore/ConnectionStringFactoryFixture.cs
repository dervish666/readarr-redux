using System.Data.SQLite;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Common.EnvironmentInfo;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.Datastore
{
    [TestFixture]
    public class ConnectionStringFactoryFixture : CoreTest<ConnectionStringFactory>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IAppFolderInfo>()
                  .SetupGet(s => s.AppDataFolder)
                  .Returns(@"C:\Readarr".AsOsAgnostic());
        }

        [Test]
        public void should_wait_a_second_for_a_busy_sqlite_database()
        {
            var builder = new SQLiteConnectionStringBuilder(Subject.MainDbConnection.ConnectionString);

            builder.BusyTimeout.Should().Be(1000);
        }
    }
}
