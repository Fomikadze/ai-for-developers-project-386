package ru.hexlet.booking.presentation

import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.config.ApplicationConfig
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json
import org.koin.core.module.Module
import org.koin.dsl.module
import org.koin.ktor.ext.inject
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger
import ru.hexlet.booking.application.Clock
import ru.hexlet.booking.application.CreateMeetingTypeHandler
import ru.hexlet.booking.application.CreateMeetingTypeHandlerImpl
import ru.hexlet.booking.application.GetOwnerHandler
import ru.hexlet.booking.application.GetOwnerHandlerImpl
import ru.hexlet.booking.application.ListMeetingTypesHandler
import ru.hexlet.booking.application.ListMeetingTypesHandlerImpl
import ru.hexlet.booking.application.MeetingTypeRepository
import ru.hexlet.booking.application.OwnerProvider
import ru.hexlet.booking.domain.Owner
import ru.hexlet.booking.infrastructure.ConfiguredOwnerProvider
import ru.hexlet.booking.infrastructure.InMemoryMeetingTypeRepository
import ru.hexlet.booking.infrastructure.SystemClock

/** Обработчики команд и запросов. Пока пуст: наполняется по мере появления историй. */
fun applicationModule(): Module =
    module {
        single<GetOwnerHandler> { GetOwnerHandlerImpl(get()) }
        single<ListMeetingTypesHandler> { ListMeetingTypesHandlerImpl(get()) }
        single<CreateMeetingTypeHandler> { CreateMeetingTypeHandlerImpl(get()) }
    }

/** Реализации портов: часы и хранилища в памяти. Новый вызов даёт свежие хранилища. */
fun infrastructureModule(): Module =
    module {
        single<Clock> { SystemClock() }
        single<MeetingTypeRepository> { InMemoryMeetingTypeRepository() }
        single<OwnerProvider> { ConfiguredOwnerProvider(get<ApplicationConfig>().owner()) }
    }

private fun ApplicationConfig.owner() =
    Owner(
        name = property("owner.name").getString(),
        title = property("owner.title").getString(),
        avatarUrl = propertyOrNull("owner.avatarUrl")?.getString()?.takeIf { it.isNotBlank() && it != "null" },
    )

/** Конфигурация приложения, читаемая из `application.conf`. */
fun configurationModule(config: ApplicationConfig): Module =
    module {
        single { config }
    }

fun Application.defaultModules(config: ApplicationConfig = environment.config): List<Module> =
    listOf(
        configurationModule(config),
        infrastructureModule(),
        applicationModule(),
    )

fun Application.configureApp(modules: List<Module>) {
    install(Koin) {
        slf4jLogger()
        modules(modules)
    }
    // Строгий разбор: у Ktor по умолчанию isLenient = true, он принял бы "30" как число.
    install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    configureErrorHandling()
    val getOwner by inject<GetOwnerHandler>()
    val listMeetingTypes by inject<ListMeetingTypesHandler>()
    val createMeetingType by inject<CreateMeetingTypeHandler>()
    routing {
        healthRoutes()
        catalogRoutes(getOwner, listMeetingTypes, createMeetingType)
    }
}

fun Application.module() = configureApp(defaultModules())
