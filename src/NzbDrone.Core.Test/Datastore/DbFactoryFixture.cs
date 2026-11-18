using System;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Exceptions;
using NzbDrone.Core.Datastore;
using NzbDrone.Core.Datastore.Migration.Framework;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.Datastore
{
    [TestFixture]
    public class DbFactoryFixture : CoreTest<DbFactory>
    {
        [SetUp]
        public void Setup()
        {
            Mocker.GetMock<IConnectionStringFactory>()
                  .SetupGet(s => s.MainDbConnection)
                  .Returns(new DatabaseConnectionInfo(DatabaseType.SQLite, "Data Source=readarr.db"));

            Mocker.GetMock<IMigrationController>()
                  .Setup(s => s.Migrate(It.IsAny<string>(), It.IsAny<MigrationContext>(), It.IsAny<DatabaseType>()))
                  .Throws(new InvalidOperationException("migration failed"));
        }

        [Test]
        public void should_roll_back_restore_when_restored_database_fails_to_migrate()
        {
            Mocker.GetMock<IRestoreDatabase>().Setup(s => s.Restore()).Returns(true);

            Assert.Throws<ReadarrStartupException>(() => Subject.Create(MigrationType.Main));

            Mocker.GetMock<IRestoreDatabase>().Verify(v => v.RollBack(), Times.Once());
        }

        [Test]
        public void should_not_roll_back_when_nothing_was_restored()
        {
            Mocker.GetMock<IRestoreDatabase>().Setup(s => s.Restore()).Returns(false);

            Assert.Throws<ReadarrStartupException>(() => Subject.Create(MigrationType.Main));

            Mocker.GetMock<IRestoreDatabase>().Verify(v => v.RollBack(), Times.Never());
        }
    }
}
